import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/stats-card'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState } from '@/components/empty-state'
import type { Database } from '@/types/database'

type RequestStatus = Database['public']['Enums']['request_status']

const PAGE_SIZE = 25

interface SearchParams {
  status?: string
  page?: string
}

export default async function RequestsPage({
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
      .from('labour_requests')
      .select(
        `id, headcount_required, headcount_filled, start_date, end_date, day_rate, status, created_at,
         site:sites!labour_requests_site_id_fkey(name),
         trade_category:trade_categories!labour_requests_trade_category_id_fkey(name)`,
        { count: 'exact' }
      )
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (params.status) q = q.eq('status', params.status as RequestStatus)
    return q
  }

  const [
    { count: totalCount },
    { count: pendingCount },
    { count: searchingCount },
    { count: fulfilledCount },
    { data: requests, count: filteredCount },
  ] = await Promise.all([
    supabase.from('labour_requests').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('labour_requests').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'pending'),
    supabase.from('labour_requests').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['searching', 'partial']),
    supabase.from('labour_requests').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'fulfilled'),
    buildQuery(),
  ])

  const totalPages = Math.ceil((filteredCount ?? 0) / PAGE_SIZE)
  const statuses: { value: string; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'searching', label: 'Searching' },
    { value: 'partial', label: 'Partial' },
    { value: 'fulfilled', label: 'Fulfilled' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="p-4 space-y-3">
      <PageHeader
        title="Labour Requests"
        description="Site requests for operatives"
        action={
          <Button asChild>
            <Link href="/requests/new">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total" value={totalCount ?? 0} />
        <StatsCard title="Pending" value={pendingCount ?? 0} />
        <StatsCard title="Searching / Partial" value={searchingCount ?? 0} />
        <StatsCard title="Fulfilled" value={fulfilledCount ?? 0} />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(({ value, label }) => {
          const active = (params.status ?? '') === value
          return (
            <Link
              key={value || 'all'}
              href={value ? `/requests?status=${value}` : '/requests'}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input bg-background hover:bg-muted'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      {!requests || requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={params.status ? 'No requests with this status' : 'No requests yet'}
          description="Create the first labour request to start filling roles."
          action={
            !params.status ? (
              <Button asChild>
                <Link href="/requests/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium">Site</th>
                <th className="text-left px-4 py-3 font-medium">Trade</th>
                <th className="text-left px-4 py-3 font-medium">Headcount</th>
                <th className="text-left px-4 py-3 font-medium">Start</th>
                <th className="text-left px-4 py-3 font-medium">Day Rate</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const site = req.site as { name: string } | null
                const trade = req.trade_category as { name: string } | null
                return (
                  <tr key={req.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/requests/${req.id}`} className="font-medium hover:underline">
                        {site?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{trade?.name ?? 'Any'}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{req.headcount_filled}</span>
                      <span className="text-muted-foreground">/{req.headcount_required}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(req.start_date).toLocaleDateString('en-GB')}
                      {req.end_date && ` → ${new Date(req.end_date).toLocaleDateString('en-GB')}`}
                    </td>
                    <td className="px-4 py-3">
                      {req.day_rate != null ? `£${Number(req.day_rate).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status ?? 'pending'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, filteredCount ?? 0)} of {filteredCount}
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/requests?${new URLSearchParams({ ...params, page: String(currentPage - 1) })}`}>
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/requests?${new URLSearchParams({ ...params, page: String(currentPage + 1) })}`}>
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
