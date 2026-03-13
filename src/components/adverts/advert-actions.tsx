'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface AdvertActionsProps {
  advertId: string
  currentStatus: string
  budget: number | null
  externalUrl: string | null
  externalId: string | null
}

export function AdvertActions({
  advertId,
  currentStatus,
  budget,
  externalUrl,
  externalId,
}: AdvertActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [urlInput, setUrlInput] = useState(externalUrl ?? '')
  const [idInput, setIdInput] = useState(externalId ?? '')
  const [budgetInput, setBudgetInput] = useState(budget != null ? String(budget) : '')

  const update = async (action: string, patch: Record<string, unknown>) => {
    setLoading(action)
    setError(null)
    const { error: err } = await supabase
      .from('adverts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', advertId)
      .eq('organization_id', orgId)
    if (err) { setError(err.message); setLoading(null); return }
    router.refresh()
    setLoading(null)
  }

  const handleStatusChange = (status: string) => {
    const patch: Record<string, unknown> = { status }
    if (status === 'active' && currentStatus === 'draft') {
      patch.started_at = new Date().toISOString()
    }
    if (status === 'ended') {
      patch.ended_at = new Date().toISOString()
    }
    update(status, patch)
  }

  const handleSaveDetails = async () => {
    await update('details', {
      external_url: urlInput || null,
      external_id: idInput || null,
      budget: budgetInput ? parseFloat(budgetInput) : null,
    })
    setEditMode(false)
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Actions</p>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Status transitions */}
      <div className="flex flex-wrap gap-2">
        {currentStatus === 'draft' && (
          <Button
            size="sm"
            className="bg-forest-600 hover:bg-forest-700 text-white"
            onClick={() => handleStatusChange('active')}
            disabled={!!loading}
          >
            {loading === 'active' && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Go Live
          </Button>
        )}
        {currentStatus === 'active' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('paused')}
              disabled={!!loading}
            >
              {loading === 'paused' && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Pause
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('ended')}
              disabled={!!loading}
              className="border-red-800 text-red-400 hover:bg-red-950"
            >
              {loading === 'ended' && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              End
            </Button>
          </>
        )}
        {currentStatus === 'paused' && (
          <>
            <Button
              size="sm"
              className="bg-forest-600 hover:bg-forest-700 text-white"
              onClick={() => handleStatusChange('active')}
              disabled={!!loading}
            >
              {loading === 'active' && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Resume
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('ended')}
              disabled={!!loading}
              className="border-red-800 text-red-400 hover:bg-red-950"
            >
              End
            </Button>
          </>
        )}
      </div>

      {/* Edit details toggle */}
      {!editMode ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground"
          onClick={() => setEditMode(true)}
        >
          Edit URL / budget
        </Button>
      ) : (
        <div className="space-y-2 border border-border rounded-md p-3">
          <div>
            <Label className="text-xs text-muted-foreground">External URL</Label>
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="mt-1 h-8 text-xs bg-card border-border text-foreground"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Platform Ad ID</Label>
            <Input
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              className="mt-1 h-8 text-xs font-mono bg-card border-border text-foreground"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Budget (£)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="mt-1 h-8 text-xs bg-card border-border text-foreground"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs bg-forest-600 hover:bg-forest-700 text-white"
              onClick={handleSaveDetails}
              disabled={!!loading}
            >
              {loading === 'details' && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
