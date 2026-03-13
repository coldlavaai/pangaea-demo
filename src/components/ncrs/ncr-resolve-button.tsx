'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, Loader2 } from 'lucide-react'

interface NcrResolveButtonProps {
  ncrId: string
}

export function NcrResolveButton({ ncrId }: NcrResolveButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResolve = async () => {
    setSaving(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: err } = await supabase
      .from('non_conformance_incidents')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id ?? null,
        resolution_notes: notes || null,
      })
      .eq('id', ncrId)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.refresh()
    setOpen(false)
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CheckCircle className="h-4 w-4 mr-2" />
        Resolve NCR
      </Button>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 max-w-lg">
      <p className="text-sm font-medium">Resolve this NCR</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div>
        <Label htmlFor="resolution_notes">Resolution Notes</Label>
        <Textarea
          id="resolution_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1"
          placeholder="Describe how this was resolved…"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleResolve} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Confirm Resolve
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
