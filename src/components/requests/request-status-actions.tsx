'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle } from 'lucide-react'
import type { Database } from '@/types/database'

type RequestStatus = Database['public']['Enums']['request_status']

interface RequestStatusActionsProps {
  requestId: string
  currentStatus: string
}

export function RequestStatusActions({ requestId, currentStatus }: RequestStatusActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (currentStatus === 'fulfilled' || currentStatus === 'cancelled') return null

  const setStatus = async (status: RequestStatus) => {
    if (!confirm(`Mark this request as ${status}?`)) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase
      .from('labour_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)
    if (err) { setError(err.message); setLoading(false); return }
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Actions</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-col gap-2">
        {currentStatus === 'pending' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatus('searching')}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Mark as Searching
          </Button>
        )}
        {(currentStatus === 'searching' || currentStatus === 'partial') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatus('fulfilled')}
            disabled={loading}
            className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
          >
            Mark as Fulfilled
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStatus('cancelled')}
          disabled={loading}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <XCircle className="h-4 w-4 mr-2" />
          Cancel Request
        </Button>
      </div>
    </div>
  )
}
