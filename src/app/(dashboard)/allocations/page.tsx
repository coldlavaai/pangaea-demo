import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/stats-card'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState } from '@/components/empty-state'
import type { Database } from '@/types/database'

type AllocationStatus = Database['public']['Enums']['allocation_status']

const PAGE_SIZE = 25

interface SearchParams {
  status?: string
  page?: string
}

export default async function AllocationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = createServiceClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!
  const currentPage = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (currentPage - 1) * PAGE_SIZE

  const buildQuery = () => {
    let q = supabase
      .from('allocations')
      .select(
        `id, status, start_date, end_date, agreed_day_rate, offer_sent_at, offer_expires_at,
         operative:operatives!allocations_operative_id_fkey(id, first_name, last_name, reference_number, phone),
         site:sites!allocations_site_id_fkey(id, name),
         labour_request:labour_requests!allocations_labour_request_id_fkey(id)`,
        { count: 'exact' }
      )
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (params.status) q = q.eq('status', params.status as AllocationStatus)
    return q
  }

  const [
    { count: totalCount },
    { count: pendingCount },
    { count: activeCount },
    { count: confirmedCount },
    { data: allocations, count: filteredCount },
  ] = await Promise.all([
    supabase.from('allocations').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('allocations').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'pending'),
    supabase.from('allocations').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active'),
    supabase.from('allocations').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'confirmed'),
    buildQuery(),
  ])

  const totalPages = Math.ceil((filteredCount ?? 0) / PAGE_SIZE)
  const statuses = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'no_show', label: 'No Show' },
    { value: 'terminated', label: 'Terminated' },
  ]

  return (
    <div className="p-4 space-y-3">
      <PageHeader title="Allocations" description="All operative allocations" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total" value={totalCount ?? 0} />
        <StatsCard title="Pending" value={pendingCount ?? 0} />
        <StatsCard title="Confirmed" value={confirmedCount ?? 0} />
        <StatsCard title="Active" value={activeCount ?? 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map(({ value, label }) => {
          const active = (params.status ?? '') === value
          return (
            <Link
              key={value || 'all'}
              href={value ? `/allocations?status=${value}` : '/allocations'}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                active ? 'bg-primary text-primary-foreground border-primary' : 'border-input bg-background hover:bg-muted'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {!allocations || allocations.length === 0 ? (
        <EmptyState icon={Link2} title="No allocations yet" description="Allocations are created from the labour pool search." />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium">Operative</th>
                <th className="text-left px-4 py-3 font-medium">Site</th>
                <th className="text-left px-4 py-3 font-medium">Dates</th>
                <th className="text-left px-4 py-3 font-medium">Day Rate</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(allocations as Array<{
                id: string
                status: string | null
                start_date: string
                end_date: string | null
                agreed_day_rate: number | null
                offer_sent_at: string | null
                offer_expires_at: string | null
                operative: { id: string; first_name: string; last_name: string; reference_number: string | null; phone: string | null } | null
                site: { id: string; name: string } | null
              }>).map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/allocations/${a.id}`} className="font-medium hover:underline">
                      {a.operative ? `${a.operative.first_name} ${a.operative.last_name}` : '—'}
                    </Link>
                    {a.operative?.reference_number && (
                      <div className="text-xs text-muted-foreground font-mono">{a.operative.reference_number}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.site ? (
                      <Link href={`/sites/${a.site.id}`} className="hover:underline">{a.site.name}</Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(a.start_date).toLocaleDateString('en-GB')}
                    {a.end_date && ` → ${new Date(a.end_date).toLocaleDateString('en-GB')}`}
                  </td>
                  <td className="px-4 py-3">
                    {a.agreed_day_rate != null ? `£${Number(a.agreed_day_rate).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status ?? 'pending'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, filteredCount ?? 0)} of {filteredCount}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/allocations?${new URLSearchParams({ ...params, page: String(currentPage - 1) })}`}>
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/allocations?${new URLSearchParams({ ...params, page: String(currentPage + 1) })}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
