'use client'

import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface ConfirmationCardProps {
  summary: string
  tool: string
  action: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationCard({ summary, onConfirm, onCancel }: ConfirmationCardProps) {
  return (
    <div className="my-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-300 mb-1">Confirm action</p>
          <p className="text-xs text-slate-300">{summary}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-md transition-colors"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-md transition-colors"
        >
          <XCircle className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  )
}
