import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeCommsRead(input: any): Promise<ToolResult> {
  const supabase = await createClient()

  switch (input.action) {
    case 'get_whatsapp_history': {
      const { data, error } = await supabase
        .from('messages')
        .select('id, direction, body, created_at')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })
        .limit(input.limit ?? 30)

      if (error) return { text_result: `Error fetching WhatsApp history: ${error.message}` }

      return {
        text_result: `Found ${data?.length ?? 0} messages.`,
        rich_result: { type: 'data_table', data: {
          columns: ['Time', 'Direction', 'Message'],
          rows: (data ?? []).map(r => [r.created_at, r.direction, String(r.body ?? '').substring(0, 80)])
        } },
      }
    }

    case 'get_activity_feed': {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, action, table_name, record_id, created_at, users!audit_log_user_id_fkey(email)')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })
        .limit(input.limit ?? 30)

      if (error) return { text_result: `Error fetching activity: ${error.message}` }

      return {
        text_result: `Found ${data?.length ?? 0} activity entries.`,
        rich_result: { type: 'data_table', data: {
          columns: ['Time', 'User', 'Action', 'Table'],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rows: (data ?? []).map((r: any) => [r.created_at, r.users?.email ?? 'system', r.action, r.table_name])
        } },
      }
    }

    default:
      return { text_result: `Unknown action: ${input.action}` }
  }
}
