'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ExportTrapButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'blocked'>('idle')

  const handleClick = async () => {
    setState('loading')
    try {
      await fetch('/api/security/export-trap', { method: 'POST' })
    } catch { /* silent */ }
    setState('blocked')
    setTimeout(() => setState('idle'), 3000)
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={state === 'loading'}
      className="border-border text-muted-foreground hover:bg-card"
    >
      <Download className="h-4 w-4 mr-2" />
      {state === 'loading' ? 'Preparing…' : state === 'blocked' ? 'Export unavailable' : 'Export'}
    </Button>
  )
}
