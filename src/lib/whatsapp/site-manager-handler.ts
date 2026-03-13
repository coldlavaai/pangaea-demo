import { SupabaseClient } from '@supabase/supabase-js'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

export interface StaffUser {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface Params {
  supabase: SupabaseClient
  user: StaffUser
  threadId: string
  intakeState: string | null
  intakeData: Record<string, unknown>
  messageBody: string
  fromPhone: string
}

const HELP_MSG = `Here's what I can do:

*arrived* — Mark a worker as arrived on site
  e.g. "arrived" → I'll ask who

*ncr* — Log an incident or problem
  e.g. "ncr" → I'll ask for details

*rap* — Rate an operative at end of assignment
  e.g. "rap" → I'll guide you through A/R/P scores

*help* — Show this menu

Reply *cancel* at any time to start over.`

const CANCEL_WORDS = ['cancel', 'stop', 'quit', 'abort', 'back', 'exit', 'restart']

export async function handleSiteManager(params: Params): Promise<string> {
  const { supabase, user, threadId, intakeState, intakeData, messageBody, fromPhone } = params
  const body = messageBody.trim().toLowerCase()

  // Cancel / escape — works at any point in any flow
  if (intakeState && intakeState.startsWith('sm_') && CANCEL_WORDS.some(w => body === w)) {
    await clearState(supabase, threadId)
    return `Cancelled. ${HELP_MSG}`
  }

  // Get site IDs this user manages (empty = admin/staff, unrestricted)
  const { data: userSites } = await supabase
    .from('user_sites')
    .select('site_id')
    .eq('user_id', user.id)
    .eq('organization_id', ORG_ID)
  const siteIds = (userSites ?? []).map(us => us.site_id as string)
  const isAdmin = siteIds.length === 0

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (!intakeState || intakeState === 'sm_idle') {
    if (body.includes('arrived') || body.includes('on site') || body.includes('on-site')) {
      await setState(supabase, threadId, 'sm_arrival_name', {})
      return `Who arrived? Reply with the operative's full name.\n\n_(Reply *cancel* to abort)_`
    }
    if (body.includes('ncr') || body.includes('incident') || body.includes('problem') || body.includes('issue') || body.includes('report')) {
      await setState(supabase, threadId, 'sm_ncr_description', {})
      return `Please describe the incident:\n\n_(Reply *cancel* to abort)_`
    }
    if (body.includes('rap') || body.includes('rate') || body.includes('review') || body.includes('rating')) {
      await setState(supabase, threadId, 'sm_rap_operative', {})
      return `Who would you like to rate? Reply with their full name.\n\n_(Reply *cancel* to abort)_`
    }
    // First contact or unknown message — show full help
    return `Hi ${user.first_name}! 👷\n\n${HELP_MSG}`
  }

  // ── ARRIVAL FLOW ──────────────────────────────────────────────────────────
  if (intakeState === 'sm_arrival_name') {
    const op = await findOperative(supabase, messageBody, siteIds, isAdmin)
    if (!op) {
      // Don't clear — let them try again
      return `Couldn't find "${messageBody}" on your active allocations. Try again with their full name, or reply *cancel* to abort.`
    }

    const arrivalUpdate = supabase
      .from('allocations')
      .update({
        status: 'active',
        actual_start_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('operative_id', op.id)
      .eq('organization_id', ORG_ID)
      .in('status', ['confirmed', 'pending'])

    if (!isAdmin && siteIds.length > 0) {
      await arrivalUpdate.in('site_id', siteIds)
    } else {
      await arrivalUpdate
    }

    await clearState(supabase, threadId)
    return `${op.first_name} ${op.last_name} marked as arrived on site. ✅`
  }

  // ── NCR FLOW ──────────────────────────────────────────────────────────────
  if (intakeState === 'sm_ncr_description') {
    await setState(supabase, threadId, 'sm_ncr_operative', { sm_ncr_description: messageBody })
    return `Which operative is involved? Reply with their full name.\n\n_(Reply *cancel* to abort)_`
  }

  if (intakeState === 'sm_ncr_operative') {
    const description = (intakeData.sm_ncr_description as string) ?? ''
    const op = await findOperative(supabase, messageBody, siteIds, isAdmin)

    if (!op) {
      return `Couldn't find "${messageBody}" on your site. Try again with their full name, or reply *cancel* to abort.`
    }

    const { data: alloc } = await supabase
      .from('allocations')
      .select('id, site_id')
      .eq('operative_id', op.id)
      .eq('organization_id', ORG_ID)
      .in('status', ['confirmed', 'active'])
      .limit(1)
      .maybeSingle()

    await supabase.from('non_conformance_incidents').insert({
      organization_id: ORG_ID,
      operative_id: op.id,
      allocation_id: alloc?.id ?? null,
      site_id: alloc?.site_id ?? siteIds[0] ?? null,
      incident_date: new Date().toISOString().split('T')[0],
      description,
      incident_type: 'other',
      severity: 'minor',
      reported_via: 'whatsapp',
      reporter_name: `${user.first_name} ${user.last_name}`,
      reported_by: user.id,
    })

    await clearState(supabase, threadId)
    return `NCR logged for ${op.first_name} ${op.last_name}. ✅\n\n"${description}"\n\nReview and update severity in the dashboard.`
  }

  // ── RAP FLOW ──────────────────────────────────────────────────────────────
  if (intakeState === 'sm_rap_operative') {
    const op = await findOperative(supabase, messageBody, siteIds, isAdmin)
    if (!op) {
      return `Couldn't find "${messageBody}". Try again with their full name, or reply *cancel* to abort.`
    }
    await setState(supabase, threadId, 'sm_rap_attitude', {
      sm_op_id: op.id,
      sm_op_name: `${op.first_name} ${op.last_name}`,
    })
    return `Rating ${op.first_name} ${op.last_name}.\n\n*Attitude* score (1–5):\n1 = Poor  2 = Below avg  3 = OK  4 = Good  5 = Excellent`
  }

  if (intakeState === 'sm_rap_attitude') {
    const score = parseScore(messageBody)
    if (!score) return `Please reply with a number between 1 and 5.`
    await setState(supabase, threadId, 'sm_rap_reliability', { ...intakeData, sm_attitude: score })
    return `Got it (A: ${score}). *Reliability* score (1–5):\n1 = Often absent  3 = Reliable  5 = Always there`
  }

  if (intakeState === 'sm_rap_reliability') {
    const score = parseScore(messageBody)
    if (!score) return `Please reply with a number between 1 and 5.`
    await setState(supabase, threadId, 'sm_rap_performance', { ...intakeData, sm_reliability: score })
    return `Got it (R: ${score}). *Performance* score (1–5):\n1 = Poor quality  3 = Meets standard  5 = Exceptional`
  }

  if (intakeState === 'sm_rap_performance') {
    const score = parseScore(messageBody)
    if (!score) return `Please reply with a number between 1 and 5.`
    await setState(supabase, threadId, 'sm_rap_safety', { ...intakeData, sm_performance: score })
    return `Got it (P: ${score}). *Safety / H&S* score (1–5):\n1 = Serious concerns  3 = Compliant  5 = Exemplary`
  }

  if (intakeState === 'sm_rap_safety') {
    const score = parseScore(messageBody)
    if (!score) return `Please reply with a number between 1 and 5.`

    const opId = intakeData.sm_op_id as string
    const opName = intakeData.sm_op_name as string
    const attitude = intakeData.sm_attitude as number
    const reliability = intakeData.sm_reliability as number
    const performance = intakeData.sm_performance as number

    const { data: alloc } = await supabase
      .from('allocations')
      .select('id')
      .eq('operative_id', opId)
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Let the DB trigger calculate rap_average and traffic_light (single source of truth)
    const { error: insertErr } = await supabase.from('performance_reviews').insert({
      organization_id: ORG_ID,
      operative_id: opId,
      allocation_id: alloc?.id ?? null,
      reliability_score: reliability,
      attitude_score: attitude,
      performance_score: performance,
      safety_score: score,
      submitted_via: 'whatsapp',
      site_manager_name: `${user.first_name} ${user.last_name}`,
      site_manager_phone: fromPhone,
    })

    if (insertErr) {
      console.error('[sm-handler] RAP insert error:', insertErr.message)
      await clearState(supabase, threadId)
      return `Sorry, there was a problem saving the rating. Please try again.`
    }

    // DB triggers handle avg_rap_score + rap_traffic_light on operative — no need to recalculate here
    const avg = Math.round(((reliability + attitude + performance + score) / 4) * 10) / 10

    await clearState(supabase, threadId)
    return `RAP rating submitted for ${opName}. ✅\n\nR: ${reliability} · A: ${attitude} · P: ${performance} · S: ${score}\nAverage: ${avg}/5`
  }

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  await clearState(supabase, threadId)
  return `Hi ${user.first_name}! 👷\n\n${HELP_MSG}`
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function setState(
  supabase: SupabaseClient,
  threadId: string,
  state: string,
  data: Record<string, unknown>
) {
  await supabase
    .from('message_threads')
    .update({ intake_state: state, intake_data: data })
    .eq('id', threadId)
}

async function clearState(supabase: SupabaseClient, threadId: string) {
  await supabase
    .from('message_threads')
    .update({ intake_state: null, intake_data: null })
    .eq('id', threadId)
}

async function findOperative(
  supabase: SupabaseClient,
  nameInput: string,
  siteIds: string[],
  isAdmin: boolean
): Promise<{ id: string; first_name: string; last_name: string } | null> {
  const parts = nameInput.trim().split(/\s+/)
  const first = parts[0] ?? ''
  const last = parts[parts.length - 1] ?? ''

  let query = supabase
    .from('operatives')
    .select('id, first_name, last_name')
    .eq('organization_id', ORG_ID)
    .ilike('first_name', `%${first}%`)

  if (parts.length > 1) {
    query = query.ilike('last_name', `%${last}%`)
  }

  const { data: ops } = await query.limit(10)
  if (!ops || ops.length === 0) return null

  // Admin: no site filter — return best name match
  if (isAdmin) return ops[0] ?? null

  // Site manager: prefer operatives with active allocation at their site(s)
  for (const op of ops) {
    const { data: alloc } = await supabase
      .from('allocations')
      .select('id')
      .eq('operative_id', op.id)
      .eq('organization_id', ORG_ID)
      .in('site_id', siteIds)
      .in('status', ['pending', 'confirmed', 'active'])
      .limit(1)
      .maybeSingle()
    if (alloc) return op
  }

  return null
}

function parseScore(input: string): number | null {
  const n = parseInt(input.trim(), 10)
  if (isNaN(n) || n < 1 || n > 5) return null
  return n
}
