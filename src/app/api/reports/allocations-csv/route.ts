import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkExportPermission } from '@/lib/export/check-export'

export async function GET() {
  const allowed = await checkExportPermission('allocations CSV')
  if (!allowed) {
    return NextResponse.json({ error: 'You do not have permission to export data.' }, { status: 403 })
  }

  const supabase = await createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const { data: allocs } = await supabase
    .from('allocations')
    .select(`
      status, start_date, end_date, agreed_day_rate, created_at,
      operative:operatives!allocations_operative_id_fkey(first_name, last_name, reference_number),
      site:sites!allocations_site_id_fkey(name),
      labour_request:labour_requests!allocations_labour_request_id_fkey(
        trade_category:trade_categories!labour_requests_trade_category_id_fkey(name)
      )
    `)
    .eq('organization_id', orgId)
    .order('start_date', { ascending: false })

  const headers = ['Operative', 'Reference', 'Site', 'Trade', 'Start Date', 'End Date', 'Day Rate (£)', 'Status']
  const rows = (allocs ?? []).map((al) => {
    const op = al.operative as { first_name: string; last_name: string; reference_number: string | null } | null
    const site = al.site as { name: string } | null
    const lr = al.labour_request as { trade_category: { name: string } | null } | null
    return [
      op ? `${op.first_name} ${op.last_name}` : '',
      op?.reference_number ?? '',
      site?.name ?? '',
      lr?.trade_category?.name ?? '',
      al.start_date ?? '',
      al.end_date ?? '',
      al.agreed_day_rate != null ? String(al.agreed_day_rate) : '',
      al.status ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`)
  })

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="pangaea-allocations-${date}.csv"`,
    },
  })
}
