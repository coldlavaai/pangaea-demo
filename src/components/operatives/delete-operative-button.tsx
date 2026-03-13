'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function DeleteOperativeButton({ operativeId, operativeName }: {
  operativeId: string
  operativeName: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/operatives/${operativeId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(`${operativeName} deleted`)
      router.push('/operatives')
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Failed to delete operative')
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-400">Delete {operativeName}?</span>
        <Button
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={handleDelete}
        >
          {loading ? 'Deleting…' : 'Confirm'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={() => setConfirming(false)}
          className="text-muted-foreground"
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setConfirming(true)}
      className="text-red-500 hover:text-red-400 hover:bg-red-950"
    >
      <Trash2 className="h-4 w-4 mr-1.5" />
      Delete
    </Button>
  )
}
