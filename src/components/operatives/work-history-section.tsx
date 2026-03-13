'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Briefcase, Plus, Trash2, Upload, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type WorkHistoryRow = Database['public']['Tables']['work_history']['Row']

interface WorkHistorySectionProps {
  operativeId: string
  cvSummary: string | null
  workHistory: WorkHistoryRow[]
}

function fmtDate(d: string | null) {
  if (!d) return null
  const date = new Date(d)
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export function WorkHistorySection({ operativeId, cvSummary, workHistory }: WorkHistorySectionProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [newEntry, setNewEntry] = useState({
    job_title: '',
    employer: '',
    start_date: '',
    end_date: '',
    description: '',
  })

  // ── CV upload ─────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-uploaded

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch(`/api/operatives/${operativeId}/upload-cv`, {
        method: 'POST',
        body: form,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed')
      } else {
        if (data.warning) {
          toast.warning(data.warning)
        } else {
          const count = data.work_history?.length ?? 0
          toast.success(`CV parsed — ${count} role${count !== 1 ? 's' : ''} extracted`)
        }
        router.refresh()
      }
    } catch {
      toast.error('Upload failed — please try again')
    } finally {
      setUploading(false)
    }
  }

  // ── Delete entry ──────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(id)
    const { error } = await supabase
      .from('work_history')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Delete failed')
    } else {
      router.refresh()
    }
    setDeleting(null)
  }

  // ── Manual add ────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newEntry.job_title.trim()) {
      toast.error('Job title is required')
      return
    }
    setAddLoading(true)
    const { error } = await supabase.from('work_history').insert({
      organization_id: orgId,
      operative_id: operativeId,
      job_title: newEntry.job_title.trim(),
      employer: newEntry.employer.trim() || null,
      start_date: newEntry.start_date || null,
      end_date: newEntry.end_date || null,
      description: newEntry.description.trim() || null,
      source: 'manual',
    })

    if (error) {
      toast.error('Failed to add entry')
    } else {
      setShowAddForm(false)
      setNewEntry({ job_title: '', employer: '', start_date: '', end_date: '', description: '' })
      router.refresh()
    }
    setAddLoading(false)
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-slate-400" />
          <h3 className="font-medium text-slate-100">Work History</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => setShowAddForm((v) => !v)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add manually
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            {uploading ? 'Parsing CV…' : 'Upload CV (PDF)'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* AI Summary */}
      {cvSummary && (
        <div className="rounded-md bg-slate-800/60 border border-slate-700 px-4 py-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">AI Summary</p>
          <p className="text-sm text-slate-300 leading-relaxed">{cvSummary}</p>
        </div>
      )}

      {/* Add entry form */}
      {showAddForm && (
        <div className="rounded-md border border-slate-700 bg-slate-800/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-300">Add role</p>
            <button onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs text-slate-400">Job Title *</Label>
              <Input
                value={newEntry.job_title}
                onChange={(e) => setNewEntry((p) => ({ ...p, job_title: e.target.value }))}
                className="h-8 text-sm bg-slate-800 border-slate-700 text-slate-100"
                placeholder="e.g. Groundworker"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Employer</Label>
              <Input
                value={newEntry.employer}
                onChange={(e) => setNewEntry((p) => ({ ...p, employer: e.target.value }))}
                className="h-8 text-sm bg-slate-800 border-slate-700 text-slate-100"
                placeholder="Company name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Start Date</Label>
              <Input
                type="date"
                value={newEntry.start_date}
                onChange={(e) => setNewEntry((p) => ({ ...p, start_date: e.target.value }))}
                className="h-8 text-sm bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">End Date</Label>
              <Input
                type="date"
                value={newEntry.end_date}
                onChange={(e) => setNewEntry((p) => ({ ...p, end_date: e.target.value }))}
                className="h-8 text-sm bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs text-slate-400">Description</Label>
              <Input
                value={newEntry.description}
                onChange={(e) => setNewEntry((p) => ({ ...p, description: e.target.value }))}
                className="h-8 text-sm bg-slate-800 border-slate-700 text-slate-100"
                placeholder="Brief description of responsibilities"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={addLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white h-7 text-xs"
          >
            {addLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Save
          </Button>
        </div>
      )}

      {/* Work history list */}
      {workHistory.length === 0 && !showAddForm ? (
        <p className="text-sm text-slate-500 text-center py-4">
          No work history yet. Upload a CV or add roles manually.
        </p>
      ) : (
        <div className="space-y-2">
          {workHistory.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-800/30 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-200">{entry.job_title}</span>
                  {entry.employer && (
                    <span className="text-xs text-slate-400">@ {entry.employer}</span>
                  )}
                  {entry.source === 'cv_parsed' && (
                    <span className="text-xs text-slate-600 font-mono">AI</span>
                  )}
                </div>
                {(entry.start_date || entry.end_date) && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fmtDate(entry.start_date) ?? '?'}
                    {' → '}
                    {entry.end_date ? fmtDate(entry.end_date) : 'Present'}
                  </p>
                )}
                {entry.description && (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{entry.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deleting === entry.id}
                className="shrink-0 text-slate-600 hover:text-red-400 transition-colors mt-0.5"
              >
                {deleting === entry.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
