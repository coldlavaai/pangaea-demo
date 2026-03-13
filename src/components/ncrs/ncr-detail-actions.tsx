'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil, Trash2, X, Check } from 'lucide-react'
import { deleteNcr, updateNcr } from '@/app/(dashboard)/ncrs/actions'

const NCR_TYPES = [
  { value: 'no_show', label: 'No Show' },
  { value: 'walk_off', label: 'Walk Off' },
  { value: 'late_arrival', label: 'Late Arrival' },
  { value: 'safety_breach', label: 'Safety Breach' },
  { value: 'drugs_alcohol', label: 'Drugs / Alcohol' },
  { value: 'conduct_issue', label: 'Conduct Issue' },
  { value: 'poor_attitude', label: 'Poor Attitude' },
  { value: 'poor_workmanship', label: 'Poor Workmanship' },
  { value: 'other', label: 'Other' },
]

const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' },
]

interface NcrDetailActionsProps {
  ncrId: string
  canEdit: boolean
  current: {
    description: string
    incident_type: string
    severity: string
    incident_date: string
    incident_time: string | null
  }
}

export function NcrDetailActions({ ncrId, canEdit, current }: NcrDetailActionsProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    description: current.description,
    incident_type: current.incident_type,
    severity: current.severity,
    incident_date: current.incident_date,
    incident_time: current.incident_time ?? '',
  })

  if (!canEdit) return null

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const { error: err } = await updateNcr(ncrId, {
      description: form.description,
      incident_type: form.incident_type,
      severity: form.severity,
      incident_date: form.incident_date,
      incident_time: form.incident_time || null,
    })
    setSaving(false)
    if (err) { setError(err); return }
    setEditing(false)
    router.refresh()
  }

  const handleDelete = async () => {
    setSaving(true)
    const { error: err } = await deleteNcr(ncrId)
    if (err) { setError(err); setSaving(false); return }
    router.push('/ncrs')
  }

  if (editing) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <p className="text-sm font-semibold">Edit NCR</p>
        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <select
              value={form.incident_type}
              onChange={e => setForm(f => ({ ...f, incident_type: e.target.value }))}
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {NCR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Severity</Label>
            <select
              value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {SEVERITY_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.incident_date} onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>Time (optional)</Label>
            <Input type="time" value={form.incident_time} onChange={e => setForm(f => ({ ...f, incident_time: e.target.value }))} className="mt-1" placeholder="HH:MM" />
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={4}
            className="mt-1"
          />
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setEditing(false); setError(null) }} disabled={saving}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (deleting) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
        <p className="text-sm font-semibold text-red-600">Delete this NCR?</p>
        <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setDeleting(false); setError(null) }} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4 mr-2" />
        Edit
      </Button>
      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30" onClick={() => setDeleting(true)}>
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
    </div>
  )
}
