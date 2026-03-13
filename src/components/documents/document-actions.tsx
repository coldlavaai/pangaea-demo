'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Trash2, Loader2, ScanSearch } from 'lucide-react'

interface DocumentActionsProps {
  docId: string
  operativeId: string
  currentStatus: string
  fileKey: string | null
  documentType?: string
}

export function DocumentActions({ docId, operativeId, currentStatus, fileKey, documentType }: DocumentActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<'verify' | 'reject' | 'delete' | 're-extract' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = async () => {
    setLoading('verify')
    setError(null)
    const res = await fetch(`/api/documents/${docId}/verify`, { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to verify document')
      setLoading(null)
      return
    }
    router.refresh()
    setLoading(null)
  }

  const reject = async () => {
    if (!rejectReason.trim()) return
    setLoading('reject')
    setError(null)
    const res = await fetch(`/api/documents/${docId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to reject document')
      setLoading(null)
      return
    }
    router.refresh()
    setShowRejectForm(false)
    setLoading(null)
  }

  const reExtract = async () => {
    setLoading('re-extract')
    setError(null)
    const res = await fetch(`/api/documents/${docId}/re-extract`, { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Re-extraction failed')
      setLoading(null)
      return
    }
    router.refresh()
    setLoading(null)
  }

  const deleteDoc = async () => {
    if (!confirm('Delete this document? This cannot be undone.')) return
    setLoading('delete')
    setError(null)

    if (fileKey) {
      await supabase.storage.from('operative-documents').remove([fileKey])
    }

    const { error: err } = await supabase.from('documents').delete().eq('id', docId)
    if (err) { setError(err.message); setLoading(null); return }

    router.push(`/operatives/${operativeId}?tab=documents`)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      <div className="flex flex-wrap gap-3">
        {currentStatus !== 'verified' && (
          <Button
            onClick={verify}
            disabled={!!loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading === 'verify' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Verify &amp; notify operative
          </Button>
        )}

        {currentStatus !== 'rejected' && !showRejectForm && (
          <Button
            onClick={() => setShowRejectForm(true)}
            disabled={!!loading}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        )}

        {(documentType === 'photo_id' || documentType === 'cscs_card') && (
          <Button
            onClick={reExtract}
            disabled={!!loading}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            {loading === 're-extract' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanSearch className="h-4 w-4 mr-2" />}
            Re-extract data
          </Button>
        )}

        <Button
          onClick={deleteDoc}
          disabled={!!loading}
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
        >
          {loading === 'delete' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
          Delete
        </Button>
      </div>

      {showRejectForm && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 p-4 space-y-3">
          <p className="text-sm font-medium text-red-600">Rejection reason (sent to operative via WhatsApp)</p>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Document expired, image too blurry to read…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <Button
              onClick={reject}
              disabled={!rejectReason.trim() || !!loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading === 'reject' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Reject &amp; notify operative
            </Button>
            <Button variant="ghost" onClick={() => setShowRejectForm(false)} disabled={!!loading}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
