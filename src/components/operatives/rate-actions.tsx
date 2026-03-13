'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GRADE_LABELS, QUARTILE_LABELS, getMidpointDayRate } from '@/lib/pay-rates'

interface PayRateRow {
  id: string
  day_rate: number
  hourly_rate: number | null
  grade: string | null
  quartile: string | null
  rate_type: string
  effective_date: string
  rationale: string | null
  created_at: string | null
  contract_duration_weeks: number | null
}

interface RateActionsProps {
  operativeId: string
  operativeName: string
  dayRate: number | null
  hourlyRate: number | null
  grade: string | null
  rateStatus: 'estimated' | 'confirmed' | null
  latestQuartile: string | null
  rateHistory: PayRateRow[]
}

const RATE_TYPE_BADGE: Record<string, string> = {
  estimated: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  confirmed: 'bg-forest-500/10 text-forest-400 border-forest-500/30',
  revised:   'bg-blue-500/10 text-blue-400 border-blue-500/30',
}

const GRADES = Object.entries(GRADE_LABELS)
const QUARTILES = Object.entries(QUARTILE_LABELS)

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function RateActions({
  operativeId,
  operativeName,
  dayRate,
  hourlyRate,
  grade,
  rateStatus,
  latestQuartile,
  rateHistory,
}: RateActionsProps) {
  const router = useRouter()
  const [historyOpen, setHistoryOpen] = useState(false)

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmRate, setConfirmRate] = useState(dayRate?.toString() ?? '')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  // Adjust dialog state
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustGrade, setAdjustGrade] = useState(grade ?? 'skilled')
  const [adjustQuartile, setAdjustQuartile] = useState(latestQuartile ?? 'q1')
  const [adjustDayRate, setAdjustDayRate] = useState(dayRate?.toString() ?? '')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustLoading, setAdjustLoading] = useState(false)
  const [adjustError, setAdjustError] = useState('')

  // When grade or quartile changes in the adjust modal, auto-fill the midpoint rate
  function handleAdjustGradeChange(g: string) {
    setAdjustGrade(g)
    const midpoint = getMidpointDayRate(g, adjustQuartile)
    if (midpoint) setAdjustDayRate(midpoint.toString())
  }

  function handleAdjustQuartileChange(q: string) {
    setAdjustQuartile(q)
    const midpoint = getMidpointDayRate(adjustGrade, q)
    if (midpoint) setAdjustDayRate(midpoint.toString())
  }

  async function handleConfirm() {
    setConfirmLoading(true)
    setConfirmError('')
    try {
      const body: Record<string, unknown> = {}
      const overrideRate = parseFloat(confirmRate)
      if (!isNaN(overrideRate) && overrideRate !== dayRate) body.day_rate = overrideRate

      const res = await fetch(`/api/operatives/${operativeId}/confirm-rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json()
        setConfirmError(d.error ?? 'Something went wrong')
      } else {
        setConfirmOpen(false)
        router.refresh()
      }
    } catch {
      setConfirmError('Network error — try again')
    } finally {
      setConfirmLoading(false)
    }
  }

  async function handleAdjust() {
    if (!adjustReason.trim()) {
      setAdjustError('Reason is required')
      return
    }
    const dayRateNum = parseFloat(adjustDayRate)
    if (isNaN(dayRateNum) || dayRateNum <= 0) {
      setAdjustError('Enter a valid day rate')
      return
    }
    setAdjustLoading(true)
    setAdjustError('')
    try {
      const res = await fetch(`/api/operatives/${operativeId}/revise-rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: adjustGrade,
          quartile: adjustQuartile,
          day_rate: dayRateNum,
          reason: adjustReason.trim(),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setAdjustError(d.error ?? 'Something went wrong')
      } else {
        setAdjustOpen(false)
        setAdjustReason('')
        router.refresh()
      }
    } catch {
      setAdjustError('Network error — try again')
    } finally {
      setAdjustLoading(false)
    }
  }

  const isEstimated = rateStatus === 'estimated' || rateStatus == null
  const hourly = hourlyRate ?? (dayRate != null ? Math.round((dayRate / 8) * 100) / 100 : null)

  return (
    <div className="rounded-lg border border-border bg-background p-5 space-y-4">
      {/* Rate display */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold text-foreground">
              {dayRate != null ? `£${dayRate}/day` : '—'}
            </span>
            {hourly != null && dayRate != null && (
              <span className="text-sm text-muted-foreground">(£{hourly.toFixed(2)}/hr)</span>
            )}
            {isEstimated ? (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 border-amber-500/30">
                <AlertTriangle className="h-3 w-3" />
                Estimated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-forest-500/10 text-forest-400 border-forest-500/30">
                <CheckCircle2 className="h-3 w-3" />
                Confirmed
              </span>
            )}
          </div>
          {grade && (
            <p className="text-sm text-muted-foreground">
              {GRADE_LABELS[grade] ?? grade}
              {latestQuartile && ` · ${QUARTILE_LABELS[latestQuartile] ?? latestQuartile}`}
            </p>
          )}
          {isEstimated && rateHistory[0]?.rationale && (
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              {rateHistory[0].rationale}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          {isEstimated && (
            <Button
              size="sm"
              className="bg-forest-600 hover:bg-forest-500 text-white"
              onClick={() => {
                setConfirmRate(dayRate?.toString() ?? '')
                setConfirmError('')
                setConfirmOpen(true)
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirm Rate
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="border-border text-muted-foreground hover:bg-card"
            onClick={() => {
              setAdjustGrade(grade ?? 'skilled')
              setAdjustQuartile(latestQuartile ?? 'q1')
              setAdjustDayRate(dayRate?.toString() ?? '')
              setAdjustReason('')
              setAdjustError('')
              setAdjustOpen(true)
            }}
          >
            Adjust Rate
          </Button>
        </div>
      </div>

      {/* Pay rate history (collapsible) */}
      {rateHistory.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            {historyOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Pay Rate History ({rateHistory.length})
          </button>

          {historyOpen && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">Date</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Rate</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Grade</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Duration</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Type</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {rateHistory.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                        {fmtDate(row.created_at)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground font-medium whitespace-nowrap">
                        £{row.day_rate}/day
                        {row.hourly_rate != null && (
                          <span className="text-muted-foreground font-normal"> · £{row.hourly_rate.toFixed(2)}/hr</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                        {row.grade ? (GRADE_LABELS[row.grade] ?? row.grade) : '—'}
                        {row.quartile && ` · ${row.quartile.toUpperCase()}`}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                        {row.contract_duration_weeks != null ? `${row.contract_duration_weeks}w` : '—'}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${RATE_TYPE_BADGE[row.rate_type] ?? ''}`}>
                          {row.rate_type.charAt(0).toUpperCase() + row.rate_type.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground max-w-xs truncate" title={row.rationale ?? ''}>
                        {row.rationale ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirm Rate dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm day rate — {operativeName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Confirm the agreed day rate for this operative. You can adjust the amount before confirming.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-rate" className="text-muted-foreground">Day Rate (£)</Label>
              <Input
                id="confirm-rate"
                type="number"
                value={confirmRate}
                onChange={(e) => setConfirmRate(e.target.value)}
                className="bg-card border-border text-foreground"
                placeholder={dayRate?.toString() ?? '0'}
              />
              {confirmRate && !isNaN(parseFloat(confirmRate)) && (
                <p className="text-xs text-muted-foreground">
                  £{(parseFloat(confirmRate) / 8).toFixed(2)}/hr
                </p>
              )}
            </div>
            {confirmError && <p className="text-sm text-red-400">{confirmError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-border text-muted-foreground hover:bg-card"
              onClick={() => setConfirmOpen(false)}
              disabled={confirmLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-forest-600 hover:bg-forest-500 text-white"
              onClick={handleConfirm}
              disabled={confirmLoading}
            >
              {confirmLoading ? 'Saving…' : 'Confirm Rate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Rate dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="bg-background border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust day rate — {operativeName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Grade</Label>
              <Select value={adjustGrade} onValueChange={handleAdjustGradeChange}>
                <SelectTrigger className="bg-card border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {GRADES.map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-muted-foreground focus:bg-[#444444] focus:text-foreground">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Quartile</Label>
              <Select value={adjustQuartile} onValueChange={handleAdjustQuartileChange}>
                <SelectTrigger className="bg-card border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {QUARTILES.map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-muted-foreground focus:bg-[#444444] focus:text-foreground">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-rate" className="text-muted-foreground">Day Rate (£)</Label>
              <Input
                id="adjust-rate"
                type="number"
                value={adjustDayRate}
                onChange={(e) => setAdjustDayRate(e.target.value)}
                className="bg-card border-border text-foreground"
              />
              {adjustDayRate && !isNaN(parseFloat(adjustDayRate)) && (
                <p className="text-xs text-muted-foreground">
                  £{(parseFloat(adjustDayRate) / 8).toFixed(2)}/hr
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-reason" className="text-muted-foreground">
                Reason <span className="text-muted-foreground">(required)</span>
              </Label>
              <Input
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="bg-card border-border text-foreground"
                placeholder="e.g. Promoted to foreman, Agreed lower rate"
              />
            </div>

            {adjustError && <p className="text-sm text-red-400">{adjustError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-border text-muted-foreground hover:bg-card"
              onClick={() => setAdjustOpen(false)}
              disabled={adjustLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-forest-600 hover:bg-forest-500 text-white"
              onClick={handleAdjust}
              disabled={adjustLoading}
            >
              {adjustLoading ? 'Saving…' : 'Save Rate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
