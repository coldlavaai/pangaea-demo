import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeOperationsRead(input: any): Promise<ToolResult> {
  const supabase = await createClient()

  switch (input.action) {
    case 'get_allocations': {
      let query = supabase
        .from('allocations')
        .select('id, status, start_date, end_date, agreed_day_rate, operatives!allocations_operative_id_fkey(first_name, last_name), sites!allocations_site_id_fkey(name)')
        .eq('organization_id', ORG_ID)
        .order('start_date', { ascending: false })
        .limit(input.limit ?? 30)

      if (input.status) query = query.eq('status', input.status)
      if (input.operative_id) query = query.eq('operative_id', input.operative_id)
      if (input.site_id) query = query.eq('site_id', input.site_id)
      if (input.date_from) query = query.gte('start_date', input.date_from)
      if (input.date_to) query = query.lte('start_date', input.date_to)

      const { data, error } = await query
      if (error) return { text_result: `Error fetching allocations: ${error.message}` }

      return {
        text_result: `Found ${data?.length ?? 0} allocations.`,
        rich_result: { type: 'allocation_table', data: data ?? [] },
      }
    }

    case 'get_timesheets': {
      let query = supabase
        .from('timesheets')
        .select('id, week_start, total_days, total_pay, status, operatives!timesheets_operative_id_fkey(first_name, last_name), sites!timesheets_site_id_fkey(name)')
        .eq('organization_id', ORG_ID)
        .order('week_start', { ascending: false })
        .limit(input.limit ?? 30)

      if (input.status) query = query.eq('status', input.status)
      if (input.operative_id) query = query.eq('operative_id', input.operative_id)
      if (input.date_from) query = query.gte('week_start', input.date_from)

      const { data, error } = await query
      if (error) return { text_result: `Error fetching timesheets: ${error.message}` }

      return {
        text_result: `Found ${data?.length ?? 0} timesheets.`,
        rich_result: { type: 'timesheet_table', data: data ?? [] },
      }
    }

    case 'get_requests': {
      let query = supabase
        .from('labour_requests')
        .select('id, status, headcount_required, headcount_filled, start_date, day_rate, sites!labour_requests_site_id_fkey(name), trade_categories!labour_requests_trade_category_id_fkey(name)')
        .eq('organization_id', ORG_ID)
        .order('start_date', { ascending: false })
        .limit(input.limit ?? 20)

      if (input.status) query = query.eq('status', input.status)
      if (input.site_id) query = query.eq('site_id', input.site_id)

      const { data, error } = await query
      if (error) return { text_result: `Error fetching requests: ${error.message}` }

      return {
        text_result: `Found ${data?.length ?? 0} labour requests.`,
        rich_result: { type: 'data_table', data: { columns: ['Site', 'Trade', 'Required', 'Filled', 'Rate', 'Status'], rows: (data ?? []).map(r => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const site = (r.sites as any)?.name ?? 'N/A'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const trade = (r.trade_categories as any)?.name ?? 'N/A'
          return [site, trade, r.headcount_required, r.headcount_filled, `£${r.day_rate ?? 'N/A'}`, r.status]
        }) } },
      }
    }

    case 'get_shifts': {
      const { data, error } = await supabase
        .from('shifts')
        .select('id, scheduled_start, scheduled_end, actual_start, actual_end, operatives!shifts_operative_id_fkey(first_name, last_name), sites!shifts_site_id_fkey(name)')
        .eq('organization_id', ORG_ID)
        .order('scheduled_start', { ascending: false })
        .limit(input.limit ?? 30)

      if (error) return { text_result: `Error fetching shifts: ${error.message}` }

      return {
        text_result: `Found ${data?.length ?? 0} shifts.`,
        rich_result: { type: 'data_table', data: { columns: ['Scheduled Start', 'Operative', 'Site', 'Actual In', 'Actual Out'], rows: (data ?? []).map(r => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const op = (r.operatives as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const site = (r.sites as any)?.name ?? 'N/A'
          return [r.scheduled_start, op ? `${op.first_name} ${op.last_name}` : 'N/A', site, r.actual_start ?? '-', r.actual_end ?? '-']
        }) } },
      }
    }

    case 'get_adverts': {
      const { data, error } = await supabase
        .from('advert_templates')
        .select('id, name, headline, platform, is_active, created_at')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })

      if (error) return { text_result: `Error fetching adverts: ${error.message}` }

      return {
        text_result: `Found ${data?.length ?? 0} advert templates.`,
        rich_result: { type: 'data_table', data: { columns: ['Name', 'Platform', 'Active'], rows: (data ?? []).map(r => [r.name, r.platform, r.is_active ? 'Yes' : 'No']) } },
      }
    }

    case 'get_agencies': {
      return { text_result: 'Agency data is not available in the current database schema.' }
    }

    default:
      return { text_result: `Unknown action: ${input.action}` }
  }
}
