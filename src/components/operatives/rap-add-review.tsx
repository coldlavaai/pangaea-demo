'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Loader2, Plus } from 'lucide-react'

interface Allocation {
  id: string
  start_date: string
  site: { name: string } | null
}

interface RapAddReviewProps {
  operativeId: string
  operativeName: string
  allocations: Allocation[]
}

function ScoreSelect({ id, label, name, defaultValue }: { id: string; label: string; name: string; defaultValue?: string }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? '3'}
        className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
      >
        <option value="1">1 — Poor</option>
        <option value="2">2 — Below average</option>
        <option value="3">3 — Satisfactory</option>
        <option value="4">4 — Good</option>
        <option value="5">5 — Excellent</option>
      </select>
    </div>
  )
}

export function RapAddReview({ operativeId, operativeName, allocations }: RapAddReviewProps) {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const fd = new FormData(e.currentTarget)

    // RAP spec: comment required when any score is 1 or 2
    const relScore = parseInt(fd.get('reliability_score') as string, 10)
    const attScore = parseInt(fd.get('attitude_score') as string, 10)
    const perfScore = parseInt(fd.get('performance_score') as string, 10)
    const safetyScore = parseInt(fd.get('safety_score') as string, 10)
    const comment = (fd.get('comment') as string).trim()
    if ([relScore, attScore, perfScore, safetyScore].some((s) => s <= 2) && !comment) {
      setError('A comment is required when scoring 1 or 2 on any category.')
      setSaving(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Look up public.users.id from auth UUID (FK points to public.users)
    let reviewerId: string | null = null
    if (user?.id) {
      const { data: pubUser } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      reviewerId = pubUser?.id ?? null
    }

    const smName = (fd.get('site_manager_name') as string) || null

    const payload = {
      organization_id: orgId,
      operative_id: operativeId,
      reliability_score: relScore,
      attitude_score: attScore,
      performance_score: perfScore,
      safety_score: safetyScore,
      comment: (fd.get('comment') as string) || null,
      allocation_id: (fd.get('allocation_id') as string) || null,
      site_manager_name: smName,
      reviewer_id: reviewerId,
      submitted_via: 'web',
    }

    const { error: err } = await supabase.from('performance_reviews').insert(payload)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    // Log to activity feed
    const avg = ((relScore + attScore + perfScore + safetyScore) / 4).toFixed(1)
    const rag = Number(avg) >= 4.0 ? 'green' : Number(avg) >= 3.0 ? 'amber' : 'red'
    await supabase.from('notifications').insert({
      organization_id: orgId,
      type: 'rap',
      title: `RAP: ${operativeName} — ${avg}/5`,
      body: `R:${relScore} A:${attScore} P:${perfScore} S:${safetyScore} · ${rag}${smName ? ` · by ${smName}` : ''}`,
      severity: 'info',
      operative_id: operativeId,
      link_url: `/operatives/${operativeId}?tab=rap`,
      read: false,
    })

    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Add Review
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-background/60 p-4 space-y-4">
      <p className="text-sm font-semibold text-muted-foreground">New RAP Review</p>

      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">{error}</p>
      )}

      {/* Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ScoreSelect id="reliability_score" label="Reliability" name="reliability_score" />
        <ScoreSelect id="attitude_score" label="Attitude" name="attitude_score" />
        <ScoreSelect id="performance_score" label="Performance" name="performance_score" />
        <ScoreSelect id="safety_score" label="Safety / H&S" name="safety_score" />
      </div>

      {/* Allocation */}
      {allocations.length > 0 && (
        <div>
          <Label htmlFor="allocation_id" className="text-xs">Linked Allocation</Label>
          <select
            id="allocation_id"
            name="allocation_id"
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Not linked to an allocation</option>
            {allocations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.site?.name ?? 'Unknown site'} — {new Date(a.start_date).toLocaleDateString('en-GB')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Site manager */}
      <div>
        <Label htmlFor="site_manager_name" className="text-xs">Site Manager Name</Label>
        <Input id="site_manager_name" name="site_manager_name" className="mt-1" placeholder="Optional" />
      </div>

      {/* Comment */}
      <div>
        <Label htmlFor="comment" className="text-xs">Comments</Label>
        <Textarea id="comment" name="comment" rows={3} className="mt-1" placeholder="Any additional notes…" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Review
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
