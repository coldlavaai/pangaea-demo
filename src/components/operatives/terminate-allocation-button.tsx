'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { terminateAllocation } from '@/app/(dashboard)/operatives/actions'

interface Props {
  allocationId: string
  siteName: string
}

export function TerminateAllocationButton({ allocationId, siteName }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)

  if (!confirming) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setConfirming(true)}
        className="h-7 px-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40"
      >
        <X className="h-3.5 w-3.5" />
        End
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-400">End {siteName}?</span>
      <Button
        size="sm"
        variant="ghost"
        disabled={loading}
        onClick={() => {
          setLoading(true)
          startTransition(async () => {
            const result = await terminateAllocation(allocationId)
            setLoading(false)
            if (result.error) {
              toast.error(result.error)
            } else {
              toast.success('Allocation ended')
              router.refresh()
            }
          })
        }}
        className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-950/40"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setConfirming(false)}
        className="h-7 px-2 text-slate-500"
      >
        Cancel
      </Button>
    </div>
  )
}
