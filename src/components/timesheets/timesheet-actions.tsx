'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Lock, Download } from 'lucide-react'

interface TimesheetActionsProps {
  timesheetId: string
  currentStatus: string
  operativeName: string
  weekStart: string
  operativeRef: string | null
  utrNumber: string | null
  niNumber: string | null
  canExport?: boolean
  exportData: {
    date: string
    hours: string
    overtime: string
    dayRate: string
    pay: string
    notes: string
  }[]
}

export function TimesheetActions({
  timesheetId,
  currentStatus,
  operativeName,
  weekStart,
  operativeRef,
  utrNumber,
  niNumber,
  canExport = false,
  exportData,
}: TimesheetActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = async (action: string, status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked', extra?: Record<string, unknown>) => {
    setLoading(action)
    setError(null)
    const { error: err } = await supabase
      .from('timesheets')
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq('id', timesheetId)
    if (err) { setError(err.message); setLoading(null); return }
    router.refresh()
    setLoading(null)
  }

  const exportCSV = () => {
    // Header rows with operative metadata for CIS payroll processing
    const meta = [
      `"Operative","${operativeName}"`,
      `"Reference","${operativeRef ?? ''}"`,
      `"UTR Number","${utrNumber ?? ''}"`,
      `"NI Number","${niNumber ?? ''}"`,
      `"Week Commencing","${weekStart}"`,
      '',
    ]
    const header = 'Date,Hours Worked,Overtime Hours,Day Rate,Day Pay,Notes'
    const rows = exportData.map((r) =>
      [r.date, r.hours, r.overtime, r.dayRate, r.pay, r.notes].map((v) => `"${v}"`).join(',')
    )
    const csv = [...meta, header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-${operativeName.replace(/\s+/g, '-')}-${weekStart}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Actions</p>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {currentStatus === 'draft' && (
          <Button size="sm" variant="outline" onClick={() => update('submit', 'submitted')}>
            {loading === 'submit' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit for Approval
          </Button>
        )}

        {currentStatus === 'submitted' && (
          <>
            <Button
              size="sm"
              onClick={() => update('approve', 'approved', { approved_at: new Date().toISOString() })}
              disabled={!!loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading === 'approve' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Approve
            </Button>
            {!showReject ? (
              <Button size="sm" variant="outline" onClick={() => setShowReject(true)} disabled={!!loading}
                className="border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            ) : null}
          </>
        )}

        {currentStatus === 'approved' && (
          <Button size="sm" variant="outline" onClick={() => update('lock', 'locked', { locked_at: new Date().toISOString() })} disabled={!!loading}>
            {loading === 'lock' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            Lock Timesheet
          </Button>
        )}

        {canExport && (
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}

        <Button size="sm" variant="outline" asChild>
          <a href={`/api/timesheets/${timesheetId}/pdf`} download>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </a>
        </Button>
      </div>

      {showReject && (
        <div className="space-y-2 border border-red-200 dark:border-red-900 rounded-md p-3">
          <p className="text-xs font-medium text-red-600">Rejection reason</p>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Hours don't match site log…"
            className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => update('reject', 'rejected', { rejected_at: new Date().toISOString(), rejection_reason: rejectReason })}
              disabled={!rejectReason.trim() || !!loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading === 'reject' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Reject
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowReject(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
