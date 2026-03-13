'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { UserPlus, Loader2, MapPin, Star } from 'lucide-react'
import { toast } from 'sonner'
import type { CandidateRow } from '@/app/(dashboard)/requests/[id]/search/page'

interface LabourPoolResultsProps {
  candidates: CandidateRow[]
  requestId: string
  siteId: string
  requestStartDate: string
  requestEndDate: string | null
  requestDayRate: number | null
  siteHasCoords: boolean
  tradeId: string | null
  includeWorking?: boolean
}

const TRAFFIC_COLOURS: Record<string, string> = {
  green: 'text-green-500',
  amber: 'text-yellow-500',
  red: 'text-red-500',
}

export function LabourPoolResults({
  candidates,
  requestId,
  siteId,
  requestStartDate,
  requestEndDate,
  requestDayRate,
  siteHasCoords,
  includeWorking = false,
}: LabourPoolResultsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const toggleWorkingUrl = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (includeWorking) {
      params.delete('include_working')
    } else {
      params.set('include_working', 'true')
    }
    return `${pathname}?${params.toString()}`
  }
  const [allocating, setAllocating] = useState<string | null>(null)
  const [allocated, setAllocated] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const allocate = async (operative: CandidateRow) => {
    setAllocating(operative.id)
    setErrors((prev) => ({ ...prev, [operative.id]: [] }))

    const res = await fetch('/api/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operativeId: operative.id,
        labourRequestId: requestId,
        siteId,
        startDate: requestStartDate,
        endDate: requestEndDate,
        agreedDayRate: requestDayRate,
        orgId,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (res.status === 422 && data.blockers?.length) {
        // Compliance check failed — show blockers under the row
        setErrors((prev) => ({ ...prev, [operative.id]: data.blockers }))
        toast.error(`Cannot allocate ${operative.first_name} ${operative.last_name}`)
      } else {
        setErrors((prev) => ({ ...prev, [operative.id]: [data.error ?? 'Allocation failed'] }))
      }
    } else {
      setAllocated((prev) => new Set([...prev, operative.id]))
      // Show any warnings (e.g. near WTD limit) as toasts
      for (const warning of data.warnings ?? []) {
        toast.warning(warning)
      }
      toast.success(`${operative.first_name} ${operative.last_name} allocated`)
      router.refresh()
    }
    setAllocating(null)
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="font-medium">No candidates found</p>
        <p className="text-sm mt-1">Try increasing the radius or removing trade filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} found</span>
        <div className="flex items-center gap-4">
          {!siteHasCoords && (
            <span className="text-yellow-600 dark:text-yellow-400 text-xs">
              Distance unavailable — site postcode not geocoded yet
            </span>
          )}
          <Link
            href={toggleWorkingUrl()}
            className={`flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 border transition-colors ${
              includeWorking
                ? 'border-amber-600 bg-amber-950/40 text-amber-400'
                : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${includeWorking ? 'bg-amber-400' : 'bg-slate-600'}`} />
            {includeWorking ? 'Including currently working' : 'Exclude currently working'}
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-medium">Operative</th>
              <th className="text-left px-4 py-3 font-medium">Trade</th>
              <th className="text-left px-4 py-3 font-medium">RAP</th>
              {siteHasCoords && (
                <th className="text-left px-4 py-3 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Distance
                  </span>
                </th>
              )}
              <th className="text-left px-4 py-3 font-medium">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  Score
                </span>
              </th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, index) => {
              const isAllocated = allocated.has(c.id) || c.already_allocated
              const isTop3 = index < 3 && !c.already_allocated
              const rapColour = c.rap_traffic_light ? TRAFFIC_COLOURS[c.rap_traffic_light] ?? '' : ''

              return (
                <tr
                  key={c.id}
                  className={`border-b last:border-0 transition-colors ${
                    isAllocated
                      ? 'bg-green-50/50 dark:bg-green-950/20'
                      : isTop3
                      ? 'bg-primary/5'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isTop3 && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          #{index + 1}
                        </span>
                      )}
                      <div>
                        <Link
                          href={`/operatives/${c.id}`}
                          className="font-medium hover:underline"
                          target="_blank"
                        >
                          {c.first_name} {c.last_name}
                        </Link>
                        {c.reference_number && (
                          <div className="text-xs text-muted-foreground font-mono">{c.reference_number}</div>
                        )}
                      </div>
                    </div>
                    {c.reemploy_status === 'caution' && c.reemploy_status !== null && (
                      <span className="mt-1 inline-block text-xs text-yellow-600 dark:text-yellow-400 font-medium">⚠ Caution</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.trade_category?.name ?? '—'}
                  </td>
                  <td className={`px-4 py-3 font-medium tabular-nums ${rapColour}`}>
                    {c.avg_rap_score != null ? c.avg_rap_score.toFixed(1) : '—'}
                  </td>
                  {siteHasCoords && (
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {c.distance_miles != null ? `${c.distance_miles} mi` : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 tabular-nums font-medium">
                    {c.rank_score}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status ?? 'prospect'} />
                  </td>
                  <td className="px-4 py-3">
                    {isAllocated ? (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Allocated</span>
                    ) : (
                      <div className="space-y-1">
                        <Button
                          size="sm"
                          onClick={() => allocate(c)}
                          disabled={allocating === c.id}
                          className="h-7 text-xs"
                        >
                          {allocating === c.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserPlus className="h-3 w-3 mr-1" />
                          )}
                          Allocate
                        </Button>
                        {(errors[c.id] ?? []).length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {errors[c.id].map((e, i) => (
                              <li key={i} className="text-xs text-destructive">
                                {e}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
