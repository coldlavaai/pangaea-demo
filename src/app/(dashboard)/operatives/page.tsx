import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Users, ChevronLeft, ChevronRight, Upload, Star } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { OperativesFilterBar } from '@/components/operatives/operatives-filter-bar'
import { OperativesTable } from '@/components/operatives/operatives-table'
import type { OperativeRow } from '@/components/operatives/operatives-table'
import { RapTableView } from '@/components/operatives/rap-table-view'
import { checkImportPermission } from '@/lib/export/check-export'
import { ExportTrapButton } from '@/components/operatives/export-trap-button'
import type { Database } from '@/types/database'

type OperativeStatus = Database['public']['Enums']['operative_status']
type LabourType = Database['public']['Enums']['labour_type']

const PAGE_SIZE = 25

interface SearchParams {
  q?: string
  status?: string
  trade_id?: string
  labour_type?: string
  compliance?: string
  data_issues?: string
  missing?: string
  page?: string
  nationality?: string
  grade?: string
  language?: string
  cscs_type?: string
  rap_min?: string
  rate_min?: string
  rate_max?: string
  sort?: string
  view?: string
}

export default async function OperativesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!
  const currentPage = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (currentPage - 1) * PAGE_SIZE

  // Resolve sort
  const currentSort = params.sort ?? 'last_worked_date:desc'
  const [sortField, sortDir] = currentSort.split(':')
  const ascending = sortDir === 'asc'

  // Build filtered operative query
  const buildQuery = () => {
    let q = supabase
      .from('operatives')
      .select(
        `id, reference_number, first_name, last_name, phone, email, ni_number,
         date_of_birth, address_line1, address_line2, city, county, postcode,
         next_of_kin_name, next_of_kin_phone,
         bank_sort_code, bank_account_number, utr_number,
         cscs_card_type, cscs_card_number, cscs_expiry, cscs_card_title, cscs_card_description,
         day_rate, hourly_rate, charge_rate, grade, status,
         avg_rap_score, rap_traffic_light, total_jobs, labour_type,
         nationality, preferred_language, compliance_alert,
         agency_name, start_date, last_worked_date, notes,
         trade_category:trade_categories!operatives_trade_category_id_fkey(name),
         entry_source, data_completeness_score,
         has_verified_photo_id, has_verified_rtw`,
        { count: 'exact' }
      )
      .eq('organization_id', orgId)
      .order(sortField || 'last_worked_date', { ascending, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (params.q) {
      q = q.or(
        `first_name.ilike.%${params.q}%,last_name.ilike.%${params.q}%,phone.ilike.%${params.q}%,reference_number.ilike.%${params.q}%`
      )
    }
    if (params.status) {
      const statuses = params.status.split(',').filter(Boolean) as OperativeStatus[]
      q = statuses.length === 1 ? q.eq('status', statuses[0]) : q.in('status', statuses)
    }
    if (params.trade_id) {
      const tradeIds = params.trade_id.split(',').filter(Boolean)
      q = tradeIds.length === 1 ? q.eq('trade_category_id', tradeIds[0]) : q.in('trade_category_id', tradeIds)
    }
    if (params.labour_type) q = q.eq('labour_type', params.labour_type as LabourType)
    if (params.compliance === 'issues') q = q.not('compliance_alert', 'is', null)
    if (params.data_issues === '1') {
      q = q.or('ni_number.is.null,and(phone.is.null,email.is.null),and(cscs_card_type.not.is.null,cscs_expiry.is.null)')
    }
    if (params.missing) {
      const fieldMap: Record<string, string> = {
        phone: 'phone.is.null',
        email: 'email.is.null',
        ni: 'ni_number.is.null',
        cscs_expiry: 'cscs_expiry.is.null',
        day_rate: 'day_rate.is.null',
        trade: 'trade_category_id.is.null',
      }
      const conditions = params.missing.split(',').filter(Boolean).map(f => fieldMap[f]).filter(Boolean)
      if (conditions.length > 0) q = q.or(conditions.join(','))
    }
    if (params.nationality) q = q.ilike('nationality', `%${params.nationality}%`)
    if (params.grade) q = q.eq('grade', params.grade as Database['public']['Enums']['operative_grade'])
    if (params.language) q = q.eq('preferred_language', params.language)
    if (params.cscs_type) q = q.eq('cscs_card_type', params.cscs_type as Database['public']['Enums']['cscs_card_type'])
    if (params.rap_min) q = q.gte('avg_rap_score', parseFloat(params.rap_min))
    if (params.rate_min) q = q.gte('day_rate', parseFloat(params.rate_min))
    if (params.rate_max) q = q.lte('day_rate', parseFloat(params.rate_max))

    return q
  }

  // Parallel queries
  const [
    { count: totalCount },
    { count: availableCount },
    { count: workingCount },
    { count: blockedCount },
    { count: complianceCount },
    { count: dataIssuesCount },
    { data: tradeCategories },
    { data: nationalities },
    { data: languages },
    { data: operatives, count: filteredCount },
    canImport,
  ] = await Promise.all([
    supabase
      .from('operatives')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId),

    supabase
      .from('operatives')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .or('phone.not.is.null,email.not.is.null'),

    supabase
      .from('operatives')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'working'),

    supabase
      .from('operatives')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'blocked'),

    supabase
      .from('operatives')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .not('compliance_alert', 'is', null),

    supabase
      .from('operatives')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .or('ni_number.is.null,and(phone.is.null,email.is.null),and(cscs_card_type.not.is.null,cscs_expiry.is.null)'),

    supabase
      .from('trade_categories')
      .select('id, name')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('operatives')
      .select('nationality')
      .eq('organization_id', orgId)
      .not('nationality', 'is', null),

    supabase
      .from('operatives')
      .select('preferred_language')
      .eq('organization_id', orgId)
      .not('preferred_language', 'is', null),

    buildQuery(),

    checkImportPermission(),
  ])

  const totalPages = Math.ceil((filteredCount ?? 0) / PAGE_SIZE)

  // Deduplicate nationality and language lists
  const uniqueNationalities = [...new Set((nationalities ?? []).map(r => r.nationality).filter(Boolean) as string[])].sort()
  const uniqueLanguages = [...new Set((languages ?? []).map(r => r.preferred_language).filter(Boolean) as string[])].sort()

  const rows = (operatives as unknown as OperativeRow[]) ?? []

  return (
    <div className="px-4 pt-2 pb-4 space-y-2">
      <PageHeader
        title="Operatives"
        description={`${filteredCount ?? 0} operative${(filteredCount ?? 0) !== 1 ? 's' : ''}`}
        action={
          <div className="flex gap-2">
            <ExportTrapButton />
            {canImport && (
              <Button asChild variant="outline" className="border-border text-muted-foreground hover:bg-card">
                <Link href="/operatives/import">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Link>
              </Button>
            )}
            <Button asChild className="bg-forest-600 text-white hover:bg-forest-700">
              <Link href="/operatives/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Operative
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats strip */}
      <div className="flex items-center gap-px rounded-lg border border-border bg-background/40 overflow-hidden divide-x divide-border">
        <div className="flex items-center gap-2.5 px-4 py-2 flex-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-lg font-bold text-foreground tabular-nums">{totalCount ?? 0}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2 flex-1">
          <span className="text-lg font-bold text-forest-400 tabular-nums">{availableCount ?? 0}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Contactable</span>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2 flex-1">
          <span className="text-lg font-bold text-blue-400 tabular-nums">{workingCount ?? 0}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Working</span>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2 flex-1">
          <span className={`text-lg font-bold tabular-nums ${(blockedCount ?? 0) > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{blockedCount ?? 0}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Blocked</span>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2 flex-1">
          <span className={`text-lg font-bold tabular-nums ${(complianceCount ?? 0) > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>{complianceCount ?? 0}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Compliance</span>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2 flex-1">
          <span className={`text-lg font-bold tabular-nums ${(dataIssuesCount ?? 0) > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>{dataIssuesCount ?? 0}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Data Issues</span>
        </div>
      </div>

      {/* Filter bar */}
      <OperativesFilterBar
        tradeCategories={tradeCategories ?? []}
        nationalities={uniqueNationalities}
        languages={uniqueLanguages}
        initialQ={params.q}
        initialStatus={params.status}
        initialTradeId={params.trade_id}
        initialLabourType={params.labour_type}
        initialNationality={params.nationality}
        initialGrade={params.grade}
        initialLanguage={params.language}
        initialCscsType={params.cscs_type}
        initialRapMin={params.rap_min}
        initialRateMin={params.rate_min}
        initialRateMax={params.rate_max}
        initialSort={params.sort}
        initialMissing={params.missing}
      />

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No operatives found"
          description="Add your first operative or adjust your filters."
          action={
            <Button asChild className="bg-forest-600 text-white hover:bg-forest-700">
              <Link href="/operatives/new">Add Operative</Link>
            </Button>
          }
        />
      ) : params.view === 'rap' ? (
        <>
          {/* Pill bar for RAP view */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/operatives" className="px-2.5 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:bg-card transition-colors">
              ← All Operatives
            </Link>
            <span className="w-px h-4 bg-[#444444]" />
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-forest-900/60 text-forest-300 border border-forest-700 flex items-center gap-1">
              <Star className="h-3 w-3" />
              RAP Scores
            </span>
            <span className="text-xs text-muted-foreground ml-auto">{rows.length} operative{rows.length !== 1 ? 's' : ''} — click Score to rate</span>
          </div>
          <RapTableView rows={rows as unknown as Parameters<typeof RapTableView>[0]['rows']} currentSort={currentSort} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({filteredCount} operative{(filteredCount ?? 0) !== 1 ? 's' : ''})
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Button asChild variant="outline" size="sm" className="border-border text-muted-foreground">
                    <Link href={`/operatives?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v) as [string, string][]), page: String(currentPage - 1) }).toString()}`}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Link>
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button asChild variant="outline" size="sm" className="border-border text-muted-foreground">
                    <Link href={`/operatives?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v) as [string, string][]), page: String(currentPage + 1) }).toString()}`}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <OperativesTable
            rows={rows}
            currentSort={currentSort}
            params={params}
            toolbarLeft={
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href="/operatives"
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    !params.compliance && !params.data_issues
                      ? 'bg-[#444444] text-muted-foreground border-border'
                      : 'border-border text-muted-foreground hover:bg-card'
                  }`}
                >All</Link>
                <Link
                  href="/operatives?compliance=issues"
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    params.compliance === 'issues'
                      ? 'bg-amber-900/60 text-amber-300 border-amber-700'
                      : 'border-border text-muted-foreground hover:bg-card'
                  }`}
                >
                  Compliance{(complianceCount ?? 0) > 0 && <span className="ml-1 bg-amber-700 text-amber-100 rounded-full px-1.5 text-[10px]">{complianceCount}</span>}
                </Link>
                <Link
                  href="/operatives?data_issues=1"
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    params.data_issues === '1'
                      ? 'bg-orange-900/60 text-orange-300 border-orange-700'
                      : 'border-border text-muted-foreground hover:bg-card'
                  }`}
                >
                  Data Issues{(dataIssuesCount ?? 0) > 0 && <span className="ml-1 bg-orange-700 text-orange-100 rounded-full px-1.5 text-[10px]">{dataIssuesCount}</span>}
                </Link>
                <span className="w-px h-4 bg-[#444444] mx-1" />
                <Link
                  href="/operatives?view=rap"
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                    params.view === 'rap'
                      ? 'bg-forest-900/60 text-forest-300 border-forest-700'
                      : 'border-border text-muted-foreground hover:bg-card'
                  }`}
                >
                  <Star className="h-3 w-3" />
                  RAP Scores
                </Link>
                <span className="w-px h-4 bg-[#444444] mx-1" />
                <TooltipProvider delayDuration={0}>
                {([
                  { key: 'green', dot: 'bg-forest-500',                          label: 'Labourer',     desc: 'H&S award (CITB HS&E test)' },
                  { key: 'blue',  dot: 'bg-blue-500',                             label: 'Skilled',      desc: 'Fully qualified tradesperson — NVQ/SVQ L2' },
                  { key: 'gold',  dot: 'bg-amber-400',                            label: 'Advanced',     desc: 'Advanced craft/supervisory — NVQ/SVQ L3' },
                  { key: 'black', dot: 'bg-neutral-800 border border-border',  label: 'Manager',      desc: 'Site/contracts manager — NVQ L4+' },
                  { key: 'red',   dot: 'bg-red-500',                              label: 'Trainee',      desc: 'In training or apprenticeship, not yet qualified' },
                  { key: 'white', dot: 'bg-white border border-border',        label: 'Pro/Academic', desc: 'Architects, engineers, surveyors or degree-level' },
                ] as const).map(({ key, dot, label, desc }) => (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap cursor-help hover:text-muted-foreground transition-colors">
                        <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${dot}`} />
                        {label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-background border border-border text-muted-foreground text-[11px]">
                      {desc}
                    </TooltipContent>
                  </Tooltip>
                ))}
                </TooltipProvider>
              </div>
            }
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, filteredCount ?? 0)} of{' '}
                {filteredCount ?? 0} operatives
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:bg-card"
                  >
                    <Link href={`/operatives?${buildParams(params, { page: String(currentPage - 1) })}`}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Link>
                  </Button>
                )}
                {currentPage < totalPages && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:bg-card"
                  >
                    <Link href={`/operatives?${buildParams(params, { page: String(currentPage + 1) })}`}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function buildParams(
  current: SearchParams,
  overrides: Record<string, string | undefined>
): string {
  const p = new URLSearchParams()
  const merged = { ...current, ...overrides }
  for (const [k, v] of Object.entries(merged)) {
    if (v) p.set(k, v)
  }
  return p.toString()
}

