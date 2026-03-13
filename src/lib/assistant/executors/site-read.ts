import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeSiteRead(input: any): Promise<ToolResult> {
  const supabase = await createClient()

  switch (input.action) {
    case 'list': {
      let query = supabase
        .from('sites')
        .select('id, name, address, is_active, created_at')
        .eq('organization_id', ORG_ID)
        .order('name')

      if (input.status === 'active') query = query.eq('is_active', true)
      if (input.status === 'inactive') query = query.eq('is_active', false)
      if (input.query) query = query.ilike('name', `%${input.query}%`)

      const { data, error } = await query
      if (error) return { text_result: `Error listing sites: ${error.message}` }

      return {
        text_result: `Found ${data?.length ?? 0} sites.`,
        rich_result: { type: 'site_table', data: data ?? [] },
      }
    }

    case 'get_detail': {
      if (!input.site_id) return { text_result: 'site_id required' }
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', input.site_id)
        .eq('organization_id', ORG_ID)
        .single()

      if (error || !data) return { text_result: `Site not found: ${error?.message}` }

      return {
        text_result: `Site: ${data.name}, active: ${data.is_active ? 'yes' : 'no'}, address: ${data.address ?? 'N/A'}.`,
        rich_result: { type: 'data_table', data: { columns: ['Field', 'Value'], rows: Object.entries(data).map(([k, v]) => [k, String(v ?? '')]) } },
      }
    }

    case 'get_headcount': {
      const { data, error } = await supabase
        .from('allocations')
        .select('site_id, status, sites!allocations_site_id_fkey(name)')
        .eq('organization_id', ORG_ID)
        .in('status', ['active', 'confirmed'])

      if (error) return { text_result: `Error fetching headcount: ${error.message}` }

      const countBySite: Record<string, { name: string; count: number }> = {}
      for (const alloc of data ?? []) {
        const siteId = alloc.site_id
        if (!siteId) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const siteName = (alloc.sites as any)?.name ?? siteId
        if (!countBySite[siteId]) countBySite[siteId] = { name: siteName, count: 0 }
        countBySite[siteId].count++
      }

      const rows = Object.entries(countBySite).map(([id, { name, count }]) => ({ id, name, headcount: count }))
      const total = rows.reduce((sum, r) => sum + r.headcount, 0)

      return {
        text_result: `${total} operatives currently active/confirmed across ${rows.length} sites.`,
        rich_result: { type: 'site_table', data: rows },
      }
    }

    default:
      return { text_result: `Unknown action: ${input.action}` }
  }
}
