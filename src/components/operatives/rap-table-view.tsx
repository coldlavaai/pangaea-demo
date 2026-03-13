'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2, Check, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? ''

export interface RapOperative {
  id: string
  first_name: string
  last_name: string
  reference_number: string | null
  phone: string | null
  status: string | null
  grade: string | null
  day_rate: number | null
  charge_rate: unknown
  avg_rap_score: number | null
  rap_traffic_light: string | null
  total_reviews: number | null
  cscs_card_type: string | null
  date_of_birth: string | null
  last_worked_date: string | null
  trade_category: { name: string } | null
}

interface RowScores { r: number; a: number; p: number; s: number; dayRate: string; chargeRate: string; completedBy: string }
interface SavedScores { r: number; a: number; p: number; s: number; reviewId: string }

const CSCS_DOT: Record<string, string> = {
  green: 'bg-forest-500', blue: 'bg-blue-500', gold: 'bg-amber-400',
  black: 'bg-neutral-700', red: 'bg-red-500', white: 'bg-white',
}

const RAG_ROW: Record<string, string> = {
  green: 'bg-forest-950/15 border-l-2 border-l-forest-600',
  amber: 'bg-amber-950/15 border-l-2 border-l-amber-600',
  red: 'bg-red-950/15 border-l-2 border-l-red-600',
}
const RAG_TEXT: Record<string, string> = { green: 'text-forest-400', amber: 'text-amber-400', red: 'text-red-400' }
const RAG_DOT: Record<string, string> = { green: 'bg-forest-500', amber: 'bg-amber-500', red: 'bg-red-500' }

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(new Date(d), 'dd/MM/yy') } catch { return '—' }
}

function ScorePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-px">
      {[1, 2, 3, 4, 5].map(v => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`h-6 w-6 rounded text-[10px] font-bold transition-all ${
            value === v ? 'bg-forest-600 text-white scale-110' : 'bg-card text-muted-foreground hover:bg-[#444444] hover:text-muted-foreground'
          }`}
        >{v}</button>
      ))}
    </div>
  )
}

function ScoreCell({ value, hasScore }: { value: number; hasScore: boolean }) {
  if (!hasScore || value === 0) return <span className="text-muted-foreground">0</span>
  const colour = value >= 4 ? 'text-forest-400 bg-forest-950/40' : value >= 3 ? 'text-amber-400 bg-amber-950/40' : 'text-red-400 bg-red-950/40'
  return <span className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold ${colour}`}>{value}</span>
}

// Server-side sort header — generates Link preserving all current URL params
function SortHeader({
  label, field, currentSort, className,
}: {
  label: string; field: string; currentSort: string; className?: string
}) {
  const [activeField, activeDir] = currentSort.split(':')
  const isActive = activeField === field
  const nextDir = isActive && activeDir === 'asc' ? 'desc' : 'asc'

  // Build href preserving all current URL params, updating sort and resetting page
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  params.set('view', 'rap')
  params.set('sort', `${field}:${nextDir}`)
  params.delete('page') // Reset to page 1 on sort change
  const href = `/operatives?${params.toString()}`

  return (
    <th className={`${className ?? ''} cursor-pointer select-none hover:text-muted-foreground transition-colors`}>
      <Link href={href} className="inline-flex items-center gap-0.5">
        {label}
        <span className="inline-flex flex-col -space-y-1">
          <ChevronUp className={`h-2.5 w-2.5 ${isActive && activeDir === 'asc' ? 'text-forest-400' : 'text-muted-foreground'}`} />
          <ChevronDown className={`h-2.5 w-2.5 ${isActive && activeDir === 'desc' ? 'text-forest-400' : 'text-muted-foreground'}`} />
        </span>
      </Link>
    </th>
  )
}

export function RapTableView({ rows, currentSort }: { rows: RapOperative[]; currentSort: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [scores, setScores] = useState<RowScores>({ r: 3, a: 3, p: 3, s: 3, dayRate: '', chargeRate: '', completedBy: '' })
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)

  // Local cache of latest review scores per operative (populated on mount + after save)
  const [latestScores, setLatestScores] = useState<Record<string, SavedScores>>({})

  // Fetch latest review scores for all operatives on this page
  useEffect(() => {
    const ids = rows.filter(r => (r.total_reviews ?? 0) > 0).map(r => r.id)
    if (!ids.length) return
    // safety_score not in generated types yet — select without it and fetch via any cast
    supabase
      .from('performance_reviews')
      .select('id, operative_id, reliability_score, attitude_score, performance_score')
      .in('operative_id', ids)
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, SavedScores> = {}
        for (const row of data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = row as any
          if (!map[r.operative_id]) {
            map[r.operative_id] = {
              r: r.reliability_score,
              a: r.attitude_score,
              p: r.performance_score,
              s: r.safety_score ?? 0,
              reviewId: r.id,
            }
          }
        }
        setLatestScores(map)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const startEdit = (op: RapOperative) => {
    const existing = latestScores[op.id]
    setEditingId(op.id)
    setSavedId(null)
    setScores({
      r: existing?.r ?? 3, a: existing?.a ?? 3, p: existing?.p ?? 3, s: existing?.s ?? 3,
      dayRate: op.day_rate != null ? String(op.day_rate) : '',
      chargeRate: op.charge_rate != null ? String(op.charge_rate) : '',
      completedBy: '',
    })
  }

  const resetRow = useCallback(async (op: RapOperative) => {
    setResetting(op.id)
    // Delete ALL performance reviews for this operative (full reset)
    await supabase.from('performance_reviews').delete().eq('operative_id', op.id).eq('organization_id', ORG_ID)
    // Clear rates on operative
    await supabase.from('operatives').update({
      day_rate: null,
      charge_rate: null,
      avg_rap_score: null,
      rap_traffic_light: null,
      total_reviews: 0,
    } as Record<string, unknown>).eq('id', op.id)
    // Clear local state
    setLatestScores(prev => { const next = { ...prev }; delete next[op.id]; return next })
    setResetting(null)
    router.refresh()
  }, [supabase, router])

  const saveRow = useCallback(async (op: RapOperative) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    let reviewerId: string | null = null
    if (user?.id) {
      const { data: pubUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      reviewerId = pubUser?.id ?? null
    }

    const { data: review, error } = await supabase.from('performance_reviews').insert({
      organization_id: ORG_ID,
      operative_id: op.id,
      reliability_score: scores.r,
      attitude_score: scores.a,
      performance_score: scores.p,
      safety_score: scores.s,
      site_manager_name: scores.completedBy.trim() || null,
      reviewer_id: reviewerId,
      submitted_via: 'web',
    }).select('id').single()

    if (error) { setSaving(false); return }

    // Update rates
    const updates: Record<string, number> = {}
    const d = parseFloat(scores.dayRate.replace('£', ''))
    const c = parseFloat(scores.chargeRate.replace('£', ''))
    if (!isNaN(d) && d > 0) updates.day_rate = d
    if (!isNaN(c) && c > 0) updates.charge_rate = c
    if (Object.keys(updates).length > 0) {
      await supabase.from('operatives').update(updates).eq('id', op.id)
    }

    // Notification
    const avg = ((scores.r + scores.a + scores.p + scores.s) / 4).toFixed(1)
    const rag = Number(avg) >= 4 ? 'green' : Number(avg) >= 3 ? 'amber' : 'red'
    await supabase.from('notifications').insert({
      organization_id: ORG_ID, type: 'rap',
      title: `RAP: ${op.first_name} ${op.last_name} — ${avg}/5`,
      body: `R:${scores.r} A:${scores.a} P:${scores.p} S:${scores.s} · ${rag}${scores.completedBy.trim() ? ` · by ${scores.completedBy.trim()}` : ''}`,
      severity: 'info', operative_id: op.id, link_url: `/operatives/${op.id}?tab=rap`, read: false,
    })

    // Update local scores cache
    setLatestScores(prev => ({
      ...prev,
      [op.id]: { r: scores.r, a: scores.a, p: scores.p, s: scores.s, reviewId: review.id },
    }))

    setSaving(false)
    setSavedId(op.id)
    setEditingId(null)
    setTimeout(() => setSavedId(null), 2000)
    router.refresh()
  }, [scores, supabase, router])

  // Server-side sorting via URL params — rows arrive pre-sorted from the page query
  const liveTotal = scores.r + scores.a + scores.p + scores.s
  const liveAvg = liveTotal / 4
  const liveRagCol = liveAvg >= 4 ? 'text-forest-400' : liveAvg >= 3 ? 'text-amber-400' : 'text-red-400'
  const liveRag = liveAvg >= 4 ? 'Green' : liveAvg >= 3 ? 'Amber' : 'Red'

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-border bg-background/80 text-muted-foreground text-[10px] uppercase tracking-wider">
            <SortHeader label="Name" field="last_name" currentSort={currentSort} className="text-left px-3 py-2 font-medium sticky left-0 bg-background/80 z-10" />
            <SortHeader label="Ref" field="reference_number" currentSort={currentSort} className="text-left px-2 py-2 font-medium" />
            <SortHeader label="Trade" field="trade_category_id" currentSort={currentSort} className="text-left px-2 py-2 font-medium" />
            <SortHeader label="Grade" field="grade" currentSort={currentSort} className="text-left px-2 py-2 font-medium" />
            <SortHeader label="CSCS" field="cscs_card_type" currentSort={currentSort} className="text-center px-1 py-2 font-medium" />
            <SortHeader label="DOB" field="date_of_birth" currentSort={currentSort} className="text-left px-2 py-2 font-medium" />
            <SortHeader label="Last Worked" field="last_worked_date" currentSort={currentSort} className="text-left px-2 py-2 font-medium" />
            <th className="text-center px-1 py-2 font-medium w-[70px] bg-forest-950/30">R</th>
            <th className="text-center px-1 py-2 font-medium w-[70px] bg-forest-950/30">A</th>
            <th className="text-center px-1 py-2 font-medium w-[70px] bg-forest-950/30">P</th>
            <th className="text-center px-1 py-2 font-medium w-[70px] bg-forest-950/30">S</th>
            <SortHeader label="Total" field="avg_rap_score" currentSort={currentSort} className="text-center px-2 py-2 font-medium" />
            <th className="text-center px-2 py-2 font-medium">RAG</th>
            <SortHeader label="Pay £" field="day_rate" currentSort={currentSort} className="text-right px-2 py-2 font-medium" />
            <SortHeader label="Charge £" field="charge_rate" currentSort={currentSort} className="text-right px-2 py-2 font-medium" />
            <SortHeader label="Margin" field="day_rate" currentSort={currentSort} className="text-right px-2 py-2 font-medium" />
            <th className="text-center px-2 py-2 font-medium w-20"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(op => {
            const isEditing = editingId === op.id
            const justSaved = savedId === op.id
            const latest = latestScores[op.id]
            const hasScore = !!latest || (op.avg_rap_score != null && op.avg_rap_score > 0)
            const charge = Number(op.charge_rate) || null
            const margin = op.day_rate && charge && charge > 0 ? ((charge - op.day_rate) / charge * 100) : null
            const total = latest ? (latest.r + latest.a + latest.p + latest.s) : (hasScore ? Math.round(op.avg_rap_score! * 4) : 0)
            const rag = op.rap_traffic_light ?? (total > 0 ? (total / 4 >= 4 ? 'green' : total / 4 >= 3 ? 'amber' : 'red') : null)

            const rowClass = isEditing
              ? 'bg-forest-950/20'
              : hasScore && rag
                ? RAG_ROW[rag] ?? ''
                : 'hover:bg-background/40'

            return (
              <tr key={op.id} className={`border-b border-border/40 transition-colors group ${rowClass}`}>
                <td className="px-3 py-1.5 sticky left-0 bg-inherit z-10">
                  <div className="flex items-center gap-1">
                    <Link href={`/operatives/${op.id}`} className="text-muted-foreground hover:text-forest-400 font-medium whitespace-nowrap">
                      {op.first_name} {op.last_name}
                    </Link>
                    {hasScore && (
                      <button
                        onClick={() => resetRow(op)}
                        title="Reset RAP score (delete latest review)"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 ml-1"
                      >
                        {resetting === op.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1.5 font-mono text-muted-foreground whitespace-nowrap">{op.reference_number ?? '—'}</td>
                <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{op.trade_category?.name ?? '—'}</td>
                <td className="px-2 py-1.5 text-muted-foreground capitalize whitespace-nowrap">{op.grade?.replace(/_/g, ' ') ?? '—'}</td>
                <td className="px-1 py-1.5 text-center">
                  {op.cscs_card_type ? <span className={`inline-block h-2.5 w-2.5 rounded-full ${CSCS_DOT[op.cscs_card_type] ?? 'bg-[#5C5C5C]'}`} title={op.cscs_card_type} /> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-1.5 text-muted-foreground tabular-nums whitespace-nowrap">{fmtDate(op.date_of_birth)}</td>
                <td className="px-2 py-1.5 text-muted-foreground tabular-nums whitespace-nowrap">{fmtDate(op.last_worked_date)}</td>

                {isEditing ? (
                  <>
                    <td className="px-1 py-1 bg-forest-950/20"><ScorePicker value={scores.r} onChange={r => setScores(s => ({ ...s, r }))} /></td>
                    <td className="px-1 py-1 bg-forest-950/20"><ScorePicker value={scores.a} onChange={a => setScores(s => ({ ...s, a }))} /></td>
                    <td className="px-1 py-1 bg-forest-950/20"><ScorePicker value={scores.p} onChange={p => setScores(s => ({ ...s, p }))} /></td>
                    <td className="px-1 py-1 bg-forest-950/20"><ScorePicker value={scores.s} onChange={sv => setScores(prev => ({ ...prev, s: sv }))} /></td>
                    <td className="px-2 py-1.5 text-center font-bold text-muted-foreground tabular-nums">{liveTotal}</td>
                    <td className="px-2 py-1.5 text-center"><span className={`text-[10px] font-bold ${liveRagCol}`}>{liveRag}</span></td>
                    <td className="px-1 py-1"><input value={scores.dayRate} onChange={e => setScores(s => ({ ...s, dayRate: e.target.value }))} className="w-16 h-6 bg-card border border-border rounded px-1.5 text-[11px] text-right text-muted-foreground" inputMode="decimal" /></td>
                    <td className="px-1 py-1"><input value={scores.chargeRate} onChange={e => setScores(s => ({ ...s, chargeRate: e.target.value }))} className="w-16 h-6 bg-card border border-border rounded px-1.5 text-[11px] text-right text-muted-foreground" inputMode="decimal" /></td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {(() => {
                        const dv = parseFloat(scores.dayRate.replace('£', ''))
                        const cv = parseFloat(scores.chargeRate.replace('£', ''))
                        if (isNaN(dv) || isNaN(cv) || cv <= 0) return <span className="text-muted-foreground">—</span>
                        const m = ((cv - dv) / cv * 100)
                        return <span className={m >= 20 ? 'text-forest-400' : m >= 10 ? 'text-amber-400' : m > 0 ? 'text-orange-400' : 'text-red-400'}>{m.toFixed(0)}%</span>
                      })()}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => saveRow(op)} disabled={saving}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold bg-forest-600 text-white hover:bg-forest-700 disabled:opacity-50">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-1 py-1.5 text-center cursor-pointer hover:bg-forest-950/30" onClick={() => startEdit(op)}><ScoreCell value={latest?.r ?? 0} hasScore={hasScore} /></td>
                    <td className="px-1 py-1.5 text-center cursor-pointer hover:bg-forest-950/30" onClick={() => startEdit(op)}><ScoreCell value={latest?.a ?? 0} hasScore={hasScore} /></td>
                    <td className="px-1 py-1.5 text-center cursor-pointer hover:bg-forest-950/30" onClick={() => startEdit(op)}><ScoreCell value={latest?.p ?? 0} hasScore={hasScore} /></td>
                    <td className="px-1 py-1.5 text-center cursor-pointer hover:bg-forest-950/30" onClick={() => startEdit(op)}><ScoreCell value={latest?.s ?? 0} hasScore={hasScore} /></td>
                    <td className="px-2 py-1.5 text-center font-bold tabular-nums text-muted-foreground">{total}</td>
                    <td className="px-2 py-1.5 text-center">
                      {rag ? (
                        <span className="inline-flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${RAG_DOT[rag] ?? 'bg-[#5C5C5C]'}`} />
                          <span className={`text-[10px] font-bold ${RAG_TEXT[rag] ?? 'text-muted-foreground'}`}>
                            {rag.charAt(0).toUpperCase() + rag.slice(1)}
                          </span>
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{op.day_rate != null ? `£${Number(op.day_rate).toFixed(0)}` : '—'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{charge != null ? `£${charge.toFixed(0)}` : '—'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {margin != null ? (
                        <span className={margin >= 20 ? 'text-forest-400' : margin >= 10 ? 'text-amber-400' : margin > 0 ? 'text-orange-400' : 'text-red-400'}>{margin.toFixed(0)}%</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {justSaved ? (
                        <span className="text-forest-400 text-[10px] font-semibold">✓ Saved</span>
                      ) : (
                        <button onClick={() => startEdit(op)}
                          className="px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-forest-400 hover:bg-forest-900/30 transition-colors">
                          {hasScore ? 'Edit' : 'Score'}
                        </button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
