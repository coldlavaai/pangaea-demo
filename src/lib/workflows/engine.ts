import { createServiceClient } from '@/lib/supabase/server'
import { WORKFLOW_REGISTRY } from './registry'
import { sendWhatsAppTemplate, getTemplateSid } from '@/lib/whatsapp/templates'
import { isWithinSessionWindow } from './engagement'
import { createNotification } from '@/lib/notifications/create'
import type { WorkflowRunRow, WorkflowTargetWithOperative, WorkflowContext } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

// Cast supabase to any for new tables not yet in the generated schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

// Re-export for backwards compatibility (workflow definitions import from here)
export { initiateEngagement } from './engagement'

// ============================================================
// triggerWorkflow — create a run, populate targets, send initial messages
// ============================================================

export async function triggerWorkflow(params: {
  type: string
  config: Record<string, unknown>
  userId: string | null
  conversationId: string | null
}): Promise<{ run_id: string; total_targets: number; targets_contacted: number; summary: string }> {
  const { type, config, userId, conversationId } = params

  const definition = WORKFLOW_REGISTRY.get(type)
  if (!definition) throw new Error(`Unknown workflow type: ${type}`)

  for (const param of definition.requiredParams) {
    if (config[param] == null) throw new Error(`Missing required param: ${param}`)
  }

  const supabase = createServiceClient()
  const db: AnyDb = supabase

  const followUpHours = (config.follow_up_hours as number) ?? 24
  const maxFollowUps = (config.max_follow_ups as number) ?? 2
  const operativeIds: string[] = config.operative_id
    ? [config.operative_id as string]
    : (config.operative_ids as string[] ?? [])

  // Create run
  const { data: run, error: runError } = await db
    .from('workflow_runs')
    .insert({
      organization_id: ORG_ID,
      workflow_type: type,
      status: 'active',
      triggered_by: userId ? 'alf' : 'manual',
      triggered_by_user: userId,
      conversation_id: conversationId,
      config,
      channel: (config.channel as string) ?? 'whatsapp',
      follow_up_hours: followUpHours,
      max_follow_ups: maxFollowUps,
      total_targets: operativeIds.length,
      site_id: (config.site_id as string) ?? null,
    })
    .select()
    .single()

  if (runError || !run) throw new Error(`Failed to create workflow run: ${runError?.message}`)

  // Populate targets
  if (operativeIds.length > 0) {
    const { error: targetsErr } = await db.from('workflow_targets').insert(
      operativeIds.map((id: string) => ({
        workflow_run_id: run.id,
        operative_id: id,
        status: 'pending',
      }))
    )
    if (targetsErr) console.error('[workflow-engine] failed to insert targets:', targetsErr.message)
  }

  // Log started event
  const { error: eventErr } = await db.from('workflow_events').insert({
    workflow_run_id: run.id,
    event_type: 'started',
    data: { operative_count: operativeIds.length, workflow_type: type },
  })
  if (eventErr) console.error('[workflow-engine] failed to log started event:', eventErr.message)

  const ctx: WorkflowContext = { run: run as WorkflowRunRow, supabase, orgId: ORG_ID }
  await definition.onTrigger(ctx)

  // Re-read run after onTrigger to get actual contacted count
  const { data: updatedRun } = await db.from('workflow_runs').select('targets_contacted').eq('id', run.id).single()
  const targetsContacted = updatedRun?.targets_contacted ?? 0

  return {
    run_id: run.id,
    total_targets: operativeIds.length,
    targets_contacted: targetsContacted,
    summary: `${definition.label} workflow started — ${targetsContacted} of ${operativeIds.length} operative${operativeIds.length !== 1 ? 's' : ''} contacted.`,
  }
}

// ============================================================
// processInbound — route an inbound WhatsApp to an active workflow
// ============================================================

export async function processInbound(
  _threadId: string,
  workflowRunId: string,
  operativeId: string,
  message: string,
  media?: { url: string; type: string }
): Promise<string | null> {
  const supabase = createServiceClient()
  const db: AnyDb = supabase

  const [runResult, targetResult] = await Promise.all([
    db
      .from('workflow_runs')
      .select('*')
      .eq('id', workflowRunId)
      .eq('status', 'active')
      .maybeSingle(),
    db
      .from('workflow_targets')
      .select('*, operative:operatives!workflow_targets_operative_id_fkey(first_name, last_name, phone, email, cscs_card_type, preferred_language)')
      .eq('workflow_run_id', workflowRunId)
      .eq('operative_id', operativeId)
      .in('status', ['pending', 'contacted', 'responded'])
      .maybeSingle(),
  ])

  const run = runResult.data
  const target = targetResult.data

  if (!run || !target) return null

  const definition = WORKFLOW_REGISTRY.get(run.workflow_type)
  if (!definition) return null

  // Log response received
  const { error: evtErr } = await db.from('workflow_events').insert({
    workflow_run_id: workflowRunId,
    target_id: target.id,
    event_type: 'response_received',
    data: { message: message.slice(0, 500), engagement_state: target.engagement_state },
  })
  if (evtErr) console.error('[workflow-engine] failed to log response event:', evtErr.message)

  const ctx: WorkflowContext = { run: run as WorkflowRunRow, supabase, orgId: ORG_ID }
  let reply: string | null = null

  if (target.engagement_state === 're_engaged') {
    // Operative just replied to RE_ENGAGE — transition to engaged
    // DO NOT interpret this reply as a workflow response
    await db.from('workflow_targets').update({
      engagement_state: 'engaged',
      updated_at: new Date().toISOString(),
    }).eq('id', target.id)

    await db.from('workflow_events').insert({
      workflow_run_id: workflowRunId,
      target_id: target.id,
      event_type: 'engaged',
      data: { triggered_by_message: message.slice(0, 200) },
    })

    console.log('[workflow-engine] operative engaged, calling onEngaged for', target.operative_id)

    if (definition.onEngaged) {
      // Re-fetch target with updated engagement_state for the hook
      const typedTarget = { ...target, engagement_state: 'engaged' as const } as WorkflowTargetWithOperative
      reply = await definition.onEngaged(ctx, typedTarget)
    }
  } else {
    // Normal flow — operative is engaged, process their reply through the workflow
    reply = await definition.onInbound(ctx, target as WorkflowTargetWithOperative, message, media)
  }

  await checkAndCompleteRun(db, run.id)

  return reply
}

// ============================================================
// processUpload — called when an operative uploads via /apply/[token]
// ============================================================

export async function processUpload(
  workflowRunId: string,
  targetId: string,
  documentId: string
): Promise<void> {
  const supabase = createServiceClient()
  const db: AnyDb = supabase

  const [runResult, targetResult] = await Promise.all([
    db.from('workflow_runs').select('*').eq('id', workflowRunId).maybeSingle(),
    db
      .from('workflow_targets')
      .select('*, operative:operatives!workflow_targets_operative_id_fkey(first_name, last_name, phone, email, cscs_card_type, preferred_language)')
      .eq('id', targetId)
      .maybeSingle(),
  ])

  const run = runResult.data
  const target = targetResult.data

  if (!run || !target) return

  const definition = WORKFLOW_REGISTRY.get(run.workflow_type)
  if (!definition) return

  const ctx: WorkflowContext = { run: run as WorkflowRunRow, supabase, orgId: ORG_ID }
  await definition.onUpload(ctx, target as WorkflowTargetWithOperative, documentId)
  await checkAndCompleteRun(db, run.id)
}

// ============================================================
// processFollowUps — called by cron every 15 minutes
// ============================================================

export async function processFollowUps(): Promise<{ processed: number; errors: number }> {
  const supabase = createServiceClient()
  const db: AnyDb = supabase
  let processed = 0
  let errors = 0

  const { data: activeRuns, error: runsErr } = await db
    .from('workflow_runs')
    .select('*')
    .eq('organization_id', ORG_ID)
    .eq('status', 'active')
    .limit(500)

  if (runsErr) {
    console.error('[workflow-engine] processFollowUps fetch error:', runsErr.message)
    return { processed: 0, errors: 1 }
  }

  for (const run of activeRuns ?? []) {
    const definition = WORKFLOW_REGISTRY.get(run.workflow_type)
    if (!definition) continue

    const { data: dueTargets } = await db
      .from('workflow_targets')
      .select('*, operative:operatives!workflow_targets_operative_id_fkey(first_name, last_name, phone, email, cscs_card_type, preferred_language)')
      .eq('workflow_run_id', run.id)
      .lte('next_follow_up_at', new Date().toISOString())
      .in('status', ['contacted', 'pending'])

    if (!dueTargets?.length) continue

    const ctx: WorkflowContext = { run: run as WorkflowRunRow, supabase, orgId: ORG_ID }

    for (const target of dueTargets) {
      try {
        if (target.messages_sent >= run.max_follow_ups) {
          // Timeout — escalate
          await definition.onTimeout(ctx, target as WorkflowTargetWithOperative)
          const { error: toErr } = await db.from('workflow_targets').update({
            status: 'timed_out',
            outcome: 'no_response',
            next_follow_up_at: null,
            updated_at: new Date().toISOString(),
          }).eq('id', target.id)
          if (toErr) console.error('[workflow-engine] timeout target update failed:', toErr.message)
          const { error: rfErr } = await db.from('workflow_runs').update({
            targets_failed: run.targets_failed + 1,
            updated_at: new Date().toISOString(),
          }).eq('id', run.id)
          if (rfErr) console.error('[workflow-engine] timeout run update failed:', rfErr.message)
          const { error: teErr } = await db.from('workflow_events').insert({
            workflow_run_id: run.id,
            target_id: target.id,
            event_type: 'timed_out',
            data: { messages_sent: target.messages_sent },
          })
          if (teErr) console.error('[workflow-engine] timeout event insert failed:', teErr.message)
        } else {
          // Follow-up — check if we need to RE_ENGAGE first
          const phone = target.operative?.phone
          const firstName = target.operative?.first_name ?? 'there'

          if (phone && !(await isWithinSessionWindow(db, phone))) {
            // Outside 24h — RE_ENGAGE instead of follow-up
            try {
              // Use casual follow-up template if available, otherwise fall back to standard RE_ENGAGE
              // Pick language-specific variant based on operative's preferred language
              const opLang = target.operative?.preferred_language ?? 'en'
              const followUpSid = getTemplateSid('RE_ENGAGE_FOLLOW_UP', opLang) || getTemplateSid('RE_ENGAGE', opLang)
              await sendWhatsAppTemplate(phone, followUpSid, { '1': firstName })
              await db.from('workflow_targets').update({
                engagement_state: 're_engaged',
                messages_sent: target.messages_sent + 1,
                next_follow_up_at: new Date(Date.now() + run.follow_up_hours * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              }).eq('id', target.id)
              console.log('[workflow-engine] follow-up RE_ENGAGE sent to', phone)
            } catch (e) {
              console.error('[workflow-engine] follow-up RE_ENGAGE failed:', phone, e)
            }
          } else {
            // Within 24h — send follow-up directly
            await definition.onFollowUp(ctx, target as WorkflowTargetWithOperative)
            const newNextFollowUp = new Date(
              Date.now() + run.follow_up_hours * 60 * 60 * 1000
            ).toISOString()
            const { error: fuErr } = await db.from('workflow_targets').update({
              messages_sent: target.messages_sent + 1,
              next_follow_up_at: newNextFollowUp,
              updated_at: new Date().toISOString(),
            }).eq('id', target.id)
            if (fuErr) console.error('[workflow-engine] follow-up target update failed:', fuErr.message)
          }
        }
        processed++
      } catch (e) {
        console.error('[workflow-engine] error processing target', target.id, e)
        errors++
      }
    }

    await checkAndCompleteRun(db, run.id)
  }

  return { processed, errors }
}

// ============================================================
// Helper: mark run completed if all targets resolved
// ============================================================

async function checkAndCompleteRun(db: AnyDb, runId: string): Promise<void> {
  const { data: unresolved, error: checkErr } = await db
    .from('workflow_targets')
    .select('id')
    .eq('workflow_run_id', runId)
    .in('status', ['pending', 'contacted', 'responded'])
    .limit(1)

  if (checkErr) {
    console.error('[workflow-engine] checkAndCompleteRun query error:', checkErr.message)
    return
  }

  if (!unresolved?.length) {
    const { error: completeErr } = await db.from('workflow_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', runId)
    if (completeErr) console.error('[workflow-engine] checkAndCompleteRun complete error:', completeErr.message)

    // Generate completion summary + notification
    await notifyWorkflowCompletion(db, runId).catch(e =>
      console.error('[workflow-engine] completion notification failed:', e)
    )
  }
}

/**
 * When a workflow completes, create a notification summarising the outcome.
 * Shows in the bell + sends Telegram push.
 */
async function notifyWorkflowCompletion(db: AnyDb, runId: string): Promise<void> {
  // Fetch run + all targets with operative names
  const { data: run } = await db
    .from('workflow_runs')
    .select('*')
    .eq('id', runId)
    .single()
  if (!run) return

  const { data: targets } = await db
    .from('workflow_targets')
    .select('status, outcome, operative:operatives!workflow_targets_operative_id_fkey(first_name, last_name)')
    .eq('workflow_run_id', runId)

  if (!targets?.length) return

  const definition = WORKFLOW_REGISTRY.get(run.workflow_type)
  const label = definition?.label ?? run.workflow_type

  // Build outcome summary
  const completed = targets.filter((t: { status: string }) => t.status === 'completed')
  const timedOut = targets.filter((t: { status: string }) => t.status === 'timed_out')
  const failed = targets.filter((t: { status: string }) => t.status === 'failed')

  const parts: string[] = []

  // List completed operatives with their outcomes
  for (const t of completed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const op = (t as any).operative
    const name = op ? `${op.first_name} ${op.last_name}` : 'Unknown'
    const outcome = (t as { outcome: string | null }).outcome
    const outcomeLabel = outcome
      ? outcome.replace(/_/g, ' ')
      : 'completed'
    parts.push(`${name} — ${outcomeLabel}`)
  }

  for (const t of timedOut) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const op = (t as any).operative
    const name = op ? `${op.first_name} ${op.last_name}` : 'Unknown'
    parts.push(`${name} — no response`)
  }

  for (const t of failed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const op = (t as any).operative
    const name = op ? `${op.first_name} ${op.last_name}` : 'Unknown'
    parts.push(`${name} — failed`)
  }

  const body = parts.join('\n')
  const title = `${label} workflow completed — ${completed.length} of ${targets.length} successful`

  // Determine if there are items needing review (pending docs, unverified data)
  const needsReview = run.workflow_type === 'profile_completion' || run.workflow_type === 'document_chase'
  const severity = timedOut.length > 0 || failed.length > 0 ? 'warning' as const : 'info' as const

  // For document workflows, find the first pending document so the notification can link to review
  let linkUrl: string | null = null
  if (needsReview) {
    // Get operative IDs from completed targets
    const { data: completedTargets } = await db
      .from('workflow_targets')
      .select('operative_id')
      .eq('workflow_run_id', runId)
      .eq('status', 'completed')
    const opIds = (completedTargets ?? []).map((t: { operative_id: string }) => t.operative_id)

    if (opIds.length > 0) {
      // Find first pending document from these operatives
      const { data: pendingDoc } = await db
        .from('documents')
        .select('id')
        .in('operative_id', opIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (pendingDoc) {
        // Link directly to review dialog
        linkUrl = `?review=${pendingDoc.id}`
      } else if (opIds.length === 1) {
        linkUrl = `/operatives/${opIds[0]}?tab=documents`
      }
    }
  }

  await createNotification(db, {
    type: 'arrive', // reuse existing type for workflow completion
    title: needsReview ? `${title} — needs review` : title,
    body,
    severity,
    link_url: linkUrl,
    push: true,
  })

  // Log completion event
  await db.from('workflow_events').insert({
    workflow_run_id: runId,
    event_type: 'workflow_completed',
    data: {
      total: targets.length,
      completed: completed.length,
      timed_out: timedOut.length,
      failed: failed.length,
      summary: parts,
    },
  })
}

// ============================================================
// processDataSubmission — called when operative submits data via web form
// Marks target completed + updates run counters (no Claude parsing needed)
// ============================================================

export async function processDataSubmission(
  workflowRunId: string,
  targetId: string,
  fields: Record<string, string>
): Promise<void> {
  const supabase = createServiceClient()
  const db: AnyDb = supabase

  const [runResult, targetResult] = await Promise.all([
    db.from('workflow_runs').select('*').eq('id', workflowRunId).maybeSingle(),
    db.from('workflow_targets')
      .select('*, operative:operatives!workflow_targets_operative_id_fkey(phone)')
      .eq('id', targetId).maybeSingle(),
  ])

  const run = runResult.data
  const target = targetResult.data
  if (runResult.error) console.error('[workflow-engine] processDataSubmission run fetch error:', runResult.error.message)
  if (targetResult.error) console.error('[workflow-engine] processDataSubmission target fetch error:', targetResult.error.message)
  if (!run || !target) return

  const orgId = run.organization_id as string
  const phone = target.operative?.phone as string | null

  // For profile_completion with pending documents: don't mark complete yet — wait for uploads
  const hasPendingDocs =
    run.workflow_type === 'profile_completion' &&
    Array.isArray(run.config.document_types) &&
    (run.config.document_types as string[]).length > 0

  if (hasPendingDocs) {
    // Record data as collected but keep target active for document uploads
    const { error: tUpd } = await db.from('workflow_targets').update({
      data: { ...target.data, collected_fields: fields, data_collected: true, collected_via: 'web_form' },
      updated_at: new Date().toISOString(),
    }).eq('id', targetId)
    if (tUpd) console.error('[workflow-engine] processDataSubmission pending target update error:', tUpd.message)

    const { error: evtErr } = await db.from('workflow_events').insert({
      workflow_run_id: workflowRunId,
      target_id: targetId,
      event_type: 'data_collected',
      data: { fields, via: 'web_form' },
    })
    if (evtErr) console.error('[workflow-engine] processDataSubmission event insert error:', evtErr.message)
    return
  }

  const { error: tComplete } = await db.from('workflow_targets').update({
    status: 'completed',
    outcome: 'data_collected',
    next_follow_up_at: null,
    data: { ...target.data, collected_fields: fields, collected_via: 'web_form' },
    updated_at: new Date().toISOString(),
  }).eq('id', targetId)
  if (tComplete) console.error('[workflow-engine] processDataSubmission target complete error:', tComplete.message)

  if (phone) {
    const { error: thErr } = await db.from('message_threads')
      .update({ active_workflow_id: null })
      .eq('phone_number', phone)
      .eq('organization_id', orgId)
    if (thErr) console.error('[workflow-engine] processDataSubmission thread update error:', thErr.message)
  }

  // Atomic increment to avoid race condition with concurrent submissions
  const { error: rUpd } = await db.rpc('increment_targets_completed', { run_id: workflowRunId })
  // Fallback to direct update if RPC doesn't exist yet
  if (rUpd) {
    const { error: rUpdFallback } = await db.from('workflow_runs').update({
      targets_completed: run.targets_completed + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', workflowRunId)
    if (rUpdFallback) console.error('[workflow-engine] processDataSubmission run update error:', rUpdFallback.message)
  }

  const { error: evtErr2 } = await db.from('workflow_events').insert({
    workflow_run_id: workflowRunId,
    target_id: targetId,
    event_type: 'completed',
    data: { outcome: 'data_collected', fields, via: 'web_form' },
  })
  if (evtErr2) console.error('[workflow-engine] processDataSubmission completed event error:', evtErr2.message)

  await checkAndCompleteRun(db, workflowRunId)
}

// Re-export SupabaseClient type for definition files
export type { SupabaseClient }
