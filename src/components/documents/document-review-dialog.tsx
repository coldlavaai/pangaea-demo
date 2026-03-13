'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react'

const DOC_TYPE_LABELS: Record<string, string> = {
  photo_id: 'Photo ID / Passport',
  right_to_work: 'Right to Work',
  cscs_card: 'CSCS Card',
  cpcs_ticket: 'CPCS Ticket',
  npors_ticket: 'NPORS Ticket',
  first_aid: 'First Aid Certificate',
  other: 'Document',
}

interface DocData {
  id: string
  document_type: string
  file_name: string
  status: string
  expiry_date: string | null
  notes: string | null
  ai_extracted_data: Record<string, unknown> | null
  created_at: string
  operative_id: string
  preview_url: string | null
  operative_name: string | null
  operative_ref: string | null
}

/**
 * Global document review dialog. Triggered via ?review={docId} in the URL.
 * Opens as a modal overlay wherever you are — Rex, operatives page, notifications, etc.
 */
export function DocumentReviewDialog() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const docId = searchParams.get('review')

  const [doc, setDoc] = useState<DocData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<'verify' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [done, setDone] = useState<'verified' | 'rejected' | null>(null)

  const close = useCallback(() => {
    // Remove ?review= from URL without full navigation
    const params = new URLSearchParams(searchParams.toString())
    params.delete('review')
    const qs = params.toString()
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [router, searchParams])

  useEffect(() => {
    if (!docId) {
      setDoc(null)
      setDone(null)
      setShowRejectInput(false)
      setRejectReason('')
      return
    }

    setLoading(true)
    setError(null)
    fetch(`/api/documents/${docId}`)
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load document')
        const data = await res.json()
        setDoc(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [docId])

  async function handleVerify() {
    if (!doc) return
    setActing('verify')
    try {
      const res = await fetch(`/api/documents/${doc.id}/verify`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Verification failed')
      }
      setDone('verified')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setActing(null)
    }
  }

  async function handleReject() {
    if (!doc || !rejectReason.trim()) return
    setActing('reject')
    try {
      const res = await fetch(`/api/documents/${doc.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Rejection failed')
      }
      setDone('rejected')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setActing(null)
    }
  }

  // Don't render anything if no review param
  if (!docId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={close}>
      <div
        className="relative bg-background border border-border rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Review Document</h2>
            {doc && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {doc.operative_name} · {doc.operative_ref} · {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
              </p>
            )}
          </div>
          <button onClick={close} className="p-1 rounded hover:bg-card text-muted-foreground hover:text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !done && (
            <div className="text-center py-8">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={close} className="mt-3 text-xs text-muted-foreground hover:text-muted-foreground">Close</button>
            </div>
          )}

          {done && (
            <div className="text-center py-10 space-y-3">
              {done === 'verified' ? (
                <>
                  <CheckCircle2 className="h-10 w-10 text-forest-400 mx-auto" />
                  <p className="text-sm font-medium text-forest-400">Document Verified</p>
                  <p className="text-xs text-muted-foreground">The operative has been notified.</p>
                </>
              ) : (
                <>
                  <XCircle className="h-10 w-10 text-red-400 mx-auto" />
                  <p className="text-sm font-medium text-red-400">Document Rejected</p>
                  <p className="text-xs text-muted-foreground">The operative has been asked to re-upload.</p>
                </>
              )}
              <button
                onClick={close}
                className="mt-4 px-4 py-2 bg-card hover:bg-[#444444] text-muted-foreground rounded-lg text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {doc && !done && !loading && (
            <div className="space-y-4">
              {/* Document preview */}
              {doc.preview_url ? (
                <div className="rounded-lg overflow-hidden border border-border bg-background">
                  {doc.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={doc.preview_url}
                      alt={doc.file_name}
                      className="w-full max-h-[50vh] object-contain"
                    />
                  ) : doc.file_name?.match(/\.pdf$/i) ? (
                    <iframe
                      src={doc.preview_url}
                      className="w-full h-[50vh]"
                      title={doc.file_name}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <FileText className="h-8 w-8 mr-2" />
                      <a href={doc.preview_url} target="_blank" rel="noopener noreferrer" className="text-forest-400 hover:underline text-sm">
                        Open {doc.file_name}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-background flex items-center justify-center py-12 text-muted-foreground text-sm">
                  No preview available
                </div>
              )}

              {/* Document details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <p className="text-muted-foreground font-medium">{DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className={`font-medium ${doc.status === 'verified' ? 'text-forest-400' : doc.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </p>
                </div>
                {doc.expiry_date && (
                  <div>
                    <span className="text-muted-foreground">Expiry</span>
                    <p className="text-muted-foreground">{new Date(doc.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Uploaded</span>
                  <p className="text-muted-foreground">{new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>

              {/* AI extracted data */}
              {doc.ai_extracted_data && Object.keys(doc.ai_extracted_data).length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">AI Extracted</span>
                  <div className="mt-1 space-y-0.5">
                    {Object.entries(doc.ai_extracted_data).map(([key, val]) => (
                      <div key={key} className="flex justify-between gap-2">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reject reason input */}
              {showRejectInput && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Rejection reason (sent to operative):</label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Photo is blurry, please retake with better lighting"
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-600 resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action bar — only show for pending documents */}
        {doc && !done && !loading && doc.status === 'pending' && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-3">
            {!showRejectInput ? (
              <>
                <button
                  onClick={() => setShowRejectInput(true)}
                  disabled={!!acting}
                  className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                >
                  Reject
                </button>
                <button
                  onClick={handleVerify}
                  disabled={!!acting}
                  className="px-4 py-2 bg-forest-600 hover:bg-forest-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {acting === 'verify' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Verify Document
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setShowRejectInput(false); setRejectReason('') }}
                  className="px-4 py-2 text-muted-foreground hover:text-muted-foreground text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || !!acting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-2"
                >
                  {acting === 'reject' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                  Confirm Reject
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
