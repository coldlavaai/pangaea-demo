import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeQualityRead(input: any): Promise<ToolResult> {
  const supabase = await createClient()

  switch (input.action) {
    case 'get_ncrs': {
      let query = supabase
        .from('non_conformance_incidents')
        .select('id, description, severity, resolved, incident_date, created_at, operatives!non_conformance_incidents_operative_id_fkey(first_name, last_name), sites!non_conformance_incidents_site_id_fkey(name)')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })
        .limit(input.limit ?? 20)

      if (input.severity) query = query.eq('severity', input.severity)
      if (input.operative_id) query = query.eq('operative_id', input.operative_id)
      if (input.site_id) query = query.eq('site_id', input.site_id)

      const { data, error } = await query
      if (error) return { text_result: `Error fetching NCRs: ${error.message}` }

      return {
        text_result: `Found ${data?.length ?? 0} NCRs.`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rich_result: { type: 'ncr_list', data: (data ?? []).map((r: any) => ({
          ...r,
          status: r.resolved ? 'resolved' : 'open',
        })) },
      }
    }

    case 'get_rap_scores': {
      // safety_score not yet in generated types — use string select + cast
      let query = (supabase as ReturnType<typeof createClient> extends Promise<infer T> ? T : never)
        .from('performance_reviews')
        .select('id, reliability_score, attitude_score, performance_score, rap_average, traffic_light, comment, created_at, operatives!performance_reviews_operative_id_fkey(first_name, last_name, id)')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })
        .limit(input.limit ?? 30)

      if (input.operative_id) query = query.eq('operative_id', input.operative_id)

      const { data, error } = await query
      if (error) return { text_result: `Error fetching RAP scores: ${error.message}` }

      return {
        text_result: `Found ${data?.length ?? 0} performance reviews.`,
        rich_result: { type: 'data_table', data: {
          columns: ['Operative', 'R', 'A', 'P', 'S', 'Avg', 'Date'],
          rows: (data ?? []).map(r => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const op = (r.operatives as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const row = r as any
            return [
              op ? `${op.first_name} ${op.last_name}` : 'N/A',
              row.reliability_score,
              row.attitude_score,
              row.performance_score,
              row.safety_score ?? '—',
              row.rap_average?.toFixed(1) ?? '—',
              row.created_at,
            ]
          })
        } },
      }
    }

    case 'get_reports': {
      const [operativesRes, ncrsRes] = await Promise.all([
        supabase.from('operatives').select('status, cscs_card_type, cscs_expiry').eq('organization_id', ORG_ID),
        supabase.from('non_conformance_incidents').select('severity, resolved').eq('organization_id', ORG_ID),
      ])

      const ops = operativesRes.data ?? []
      const ncrs = ncrsRes.data ?? []

      const today = new Date()
      const in30 = new Date(); in30.setDate(in30.getDate() + 30)
      const cscsExpiring = ops.filter(op => op.cscs_expiry && new Date(op.cscs_expiry) <= in30 && new Date(op.cscs_expiry) >= today)
      const cscsExpired = ops.filter(op => op.cscs_expiry && new Date(op.cscs_expiry) < today)
      const openNcrs = ncrs.filter(n => !n.resolved)
      const criticalNcrs = ncrs.filter(n => n.severity === 'critical' && !n.resolved)

      const statsData = [
        { label: 'Total Operatives', value: ops.length, color: 'blue' },
        { label: 'CSCS Expired', value: cscsExpired.length, color: 'red' },
        { label: 'CSCS Expiring 30d', value: cscsExpiring.length, color: 'amber' },
        { label: 'Open NCRs', value: openNcrs.length, color: 'orange' },
        { label: 'Critical NCRs', value: criticalNcrs.length, color: 'red' },
      ]

      return {
        text_result: `Report summary: ${ops.length} operatives, ${cscsExpired.length} expired CSCS, ${cscsExpiring.length} expiring in 30 days, ${openNcrs.length} open NCRs (${criticalNcrs.length} critical).`,
        rich_result: { type: 'stats_grid', data: statsData },
      }
    }

    default:
      return { text_result: `Unknown action: ${input.action}` }
  }
}
