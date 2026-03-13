'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MessageCircle, Loader2, CheckCircle } from 'lucide-react'

interface SendOfferButtonProps {
  allocationId: string
  alreadySent: boolean
  operativeName: string
}

export function SendOfferButton({ allocationId, alreadySent, operativeName }: SendOfferButtonProps) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    const action = alreadySent ? 'Resend the WhatsApp offer' : 'Send WhatsApp offer'
    if (!confirm(`${action} to ${operativeName}?`)) return

    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/allocations/${allocationId}/send-offer`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send offer')
      setSent(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error sending offer')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
        <CheckCircle className="h-4 w-4" />
        Offer sent via WhatsApp
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Button
        onClick={send}
        disabled={sending}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <MessageCircle className="h-4 w-4 mr-2" />
        )}
        {alreadySent ? 'Resend Offer' : 'Send WhatsApp Offer'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
