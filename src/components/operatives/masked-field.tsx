'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface MaskedFieldProps {
  value: string | null | undefined
  label: string
}

export function MaskedField({ value, label }: MaskedFieldProps) {
  const [revealed, setRevealed] = useState(false)

  if (!value) return <span className="text-muted-foreground text-xs italic">Not set</span>

  return (
    <span className="flex items-center gap-2 font-mono text-xs">
      <span className={revealed ? 'text-foreground' : 'text-muted-foreground tracking-widest'}>
        {revealed ? value : '•'.repeat(Math.min(value.length, 12))}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        title={revealed ? `Hide ${label}` : `Reveal ${label}`}
        className="text-muted-foreground hover:text-muted-foreground transition-colors"
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </span>
  )
}
