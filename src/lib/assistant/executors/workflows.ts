import { createServiceClient } from '@/lib/supabase/server'
import { triggerWorkflow } from '@/lib/workflows/engine'
import type { ToolResult } from '../types'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeWorkflows(input: any, userId: string, conversationId?: string): Promise<ToolResult> {
  switch (input.action) {

    case 'trigger': {
      if (!input.confirmed) return { text_result: 'CONFIRMATION_REQUIRED', rich_result: null }
      if (!input.workflow_type) return { text_result: 'workflow_type is required', rich_result: null }

      const config: Record<string, unknown> = {}
      if (input.operative_id) config.operative_ids = [input.operative_id as string]
      if (input.operative_ids) config.operative_ids = input.operative_ids
      if (input.site_id) config.site_id = input.site_id
      if (input.document_type) config.document_type = input.document_type
      if (input.document_types) config.document_types = input.document_types
      if (input.data_field) config.data_fields = [input.data_field as string]
      if (input.data_fields) config.data_fields = input.data_fields
      if (input.day_rate != null) config.day_rate = input.day_rate
      if (input.start_date) config.start_date = input.start_date
      if (input.expiry_window_days != null) config.expiry_window_days = input.expiry_window_days
      if (input.channel) config.channel = input.channel

      try {
        const result = await triggerWorkflow({
          type: input.workflow_type,
          config,
          userId,
          conversationId: conversationId ?? null,
        })

        return {
          text_result: result.summary,
          rich_result: {
            type: 'workflow_status',
            data: {
              run_id: result.run_id,
              workflow_type: input.workflow_type,
              status: 'active',
              total_targets: result.total_targets,
              targets_contacted: result.targets_contacted,
              targets_completed: 0,
              targets_failed: 0,
            },
          },
        }
      } catch (err) {
        return {
          text_result: `Failed to trigger workflow: ${err instanceof Error ? err.message : String(err)}`,
          rich_result: null,
        }
      }
    }

    case 'get_status': {
      if (!input.workflow_id) return { text_result: 'workflow_id is required', rich_result: null }

      const rawClient = createServiceClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = rawClient as any

      const { data: run } = await supabase
        .from('workflow_runs')
        .select('*')
        .eq('id', input.workflow_id)
        .eq('organization_id', ORG_ID)
        .single()

      if (!run) return { text_result: 'Workflow run not found.', rich_result: null }

      const { data: targets } = await supabase
        .from('workflow_targets')
        .select('id, operative_id, status, outcome, messages_sent, last_contacted_at, operative:operatives!workflow_targets_operative_id_fkey(first_name, last_name)')
        .eq('workflow_run_id', input.workflow_id)

      return {
        text_result: `${run.workflow_type} workflow — ${run.status}. ${run.targets_completed}/${run.total_targets} completed.`,
        rich_result: {
          type: 'workflow_status',
          data: {
            run_id: run.id,
            workflow_type: run.workflow_type,
            status: run.status,
            total_targets: run.total_targets,
            targets_contacted: run.targets_contacted,
            targets_responded: run.targets_responded,
            targets_completed: run.targets_completed,
            targets_failed: run.targets_failed,
            created_at: run.created_at,
            targets: targets ?? [],
          },
        },
      }
    }

    case 'list_active': {
      const rawClient = createServiceClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = rawClient as any

      const { data: runs } = await supabase
        .from('workflow_runs')
        .select('id, workflow_type, status, total_targets, targets_completed, targets_failed, created_at')
        .eq('organization_id', ORG_ID)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!runs?.length) return { text_result: 'No active workflows.', rich_result: null }

      return {
        text_result: `${runs.length} active workflow${runs.length !== 1 ? 's' : ''}.`,
        rich_result: {
          type: 'data_table',
          data: {
            columns: ['Type', 'Progress', 'Started'],
            rows: runs.map((r: { workflow_type: string; targets_completed: number; total_targets: number; created_at: string }) => [
              r.workflow_type.replace(/_/g, ' '),
              `${r.targets_completed}/${r.total_targets}`,
              new Date(r.created_at).toLocaleDateString('en-GB'),
            ]),
          },
        },
      }
    }

    case 'cancel': {
      if (!input.confirmed) return { text_result: 'CONFIRMATION_REQUIRED', rich_result: null }
      if (!input.workflow_id) return { text_result: 'workflow_id is required', rich_result: null }

      const rawClient = createServiceClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = rawClient as any

      const { data: targets } = await supabase
        .from('workflow_targets')
        .select('id, operative:operatives!workflow_targets_operative_id_fkey(phone)')
        .eq('workflow_run_id', input.workflow_id)
        .in('status', ['pending', 'contacted', 'responded'])

      for (const target of targets ?? []) {
        const phone = target.operative?.phone as string | null
        if (phone) {
          await supabase.from('message_threads')
            .update({ active_workflow_id: null })
            .eq('phone_number', phone)
            .eq('organization_id', ORG_ID)
        }
      }

      await supabase.from('workflow_runs')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', input.workflow_id)
        .eq('organization_id', ORG_ID)

      await supabase.from('workflow_events').insert({
        workflow_run_id: input.workflow_id,
        event_type: 'cancelled',
        data: { cancelled_by: userId },
      })

      return { text_result: 'Workflow cancelled and all active threads cleared.', rich_result: null }
    }

    default:
      return { text_result: `Unknown action: ${input.action}`, rich_result: null }
  }
}
