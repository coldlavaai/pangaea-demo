'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/types/database'

type AllocationStatus = Database['public']['Enums']['allocation_status']

interface AllocationStatusActionsProps {
  allocationId: string
  currentStatus: string
  operativeName: string
}

// Valid transitions
const TRANSITIONS: Record<string, { status: AllocationStatus; label: string; className?: string }[]> = {
  pending: [
    { status: 'confirmed', label: 'Mark Confirmed', className: 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950' },
    { status: 'no_show', label: 'Mark No Show', className: 'border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950' },
    { status: 'terminated', label: 'Terminate', className: 'text-destructive hover:bg-destructive/10' },
  ],
  confirmed: [
    { status: 'active', label: 'Mark Active (On Site)', className: 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950' },
    { status: 'no_show', label: 'Mark No Show', className: 'border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950' },
    { status: 'terminated', label: 'Terminate', className: 'text-destructive hover:bg-destructive/10' },
  ],
  active: [
    { status: 'completed', label: 'Mark Completed', className: 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950' },
    { status: 'terminated', label: 'Terminate', className: 'text-destructive hover:bg-destructive/10' },
  ],
}

export function AllocationStatusActions({ allocationId, currentStatus, operativeName }: AllocationStatusActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const transitions = TRANSITIONS[currentStatus] ?? []
  if (transitions.length === 0) return null

  const transition = async (newStatus: AllocationStatus) => {
    if (!confirm(`Set allocation for ${operativeName} to "${newStatus}"?`)) return
    setLoading(newStatus)
    setError(null)

    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    if (newStatus === 'active') updates.actual_start_date = new Date().toISOString().slice(0, 10)
    if (newStatus === 'completed') updates.actual_end_date = new Date().toISOString().slice(0, 10)

    const { error: err } = await supabase
      .from('allocations')
      .update(updates)
      .eq('id', allocationId)

    if (err) {
      setError(err.message)
    } else {
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Actions</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <Button
            key={t.status}
            variant="outline"
            size="sm"
            onClick={() => transition(t.status)}
            disabled={!!loading}
            className={t.className}
          >
            {loading === t.status && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
