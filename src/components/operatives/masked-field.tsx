'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface MaskedFieldProps {
  value: string | null | undefined
  label: string
}

export function MaskedField({ value, label }: MaskedFieldProps) {
  const [revealed, setRevealed] = useState(false)

  if (!value) return <span className="text-slate-600 text-xs italic">Not set</span>

  return (
    <span className="flex items-center gap-2 font-mono text-xs">
      <span className={revealed ? 'text-slate-100' : 'text-slate-400 tracking-widest'}>
        {revealed ? value : '•'.repeat(Math.min(value.length, 12))}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        title={revealed ? `Hide ${label}` : `Reveal ${label}`}
        className="text-slate-500 hover:text-slate-300 transition-colors"
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </span>
  )
}
