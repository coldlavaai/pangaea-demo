'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Check, X, Pencil, Loader2 } from 'lucide-react'

type FieldType = 'text' | 'number' | 'date' | 'select' | 'toggle' | 'textarea'

interface SelectOption {
  value: string
  label: string
}

interface EditableInfoRowProps {
  label: string
  value: string | number | boolean | null | undefined
  /** Display value override — e.g. formatted date, currency prefix */
  displayValue?: string | null
  field: string
  operativeId: string
  type?: FieldType
  /** Options for select fields */
  options?: SelectOption[]
  mono?: boolean
  capitalize?: boolean
  highlight?: 'green' | 'amber' | 'red'
  /** Suffix for display (e.g. "/day", " yrs") */
  suffix?: string
  /** Prefix for display (e.g. "£") */
  prefix?: string
}

export function EditableInfoRow({
  label,
  value,
  displayValue,
  field,
  operativeId,
  type = 'text',
  options,
  mono = false,
  capitalize = false,
  highlight,
  suffix = '',
  prefix = '',
}: EditableInfoRowProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)

  // Sync if parent value changes
  useEffect(() => {
    if (!editing) setLocalValue(value)
  }, [value, editing])

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement && type === 'text') {
        inputRef.current.select()
      }
    }
  }, [editing, type])

  const save = useCallback(async () => {
    if (saving) return
    // No change — just close
    if (localValue === value) {
      setEditing(false)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/operatives/${operativeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          value: localValue === '' ? null : localValue,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }

      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [localValue, value, saving, operativeId, field])

  const cancel = useCallback(() => {
    setLocalValue(value)
    setEditing(false)
    setError(null)
  }, [value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }, [save, cancel, type])

  // Toggle fields save immediately on click
  if (type === 'toggle') {
    const boolVal = localValue === true
    return (
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-slate-500 shrink-0">{label}</span>
        <button
          onClick={async () => {
            const newVal = !boolVal
            setLocalValue(newVal)
            setSaving(true)
            try {
              const res = await fetch(`/api/operatives/${operativeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, value: newVal }),
              })
              if (!res.ok) {
                setLocalValue(boolVal) // revert
              }
            } catch {
              setLocalValue(boolVal) // revert
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving}
          className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer',
            localValue === true ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-400 hover:text-slate-300',
          )}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : localValue === true ? 'Yes' : 'No'}
        </button>
      </div>
    )
  }

  // Display mode
  if (!editing) {
    const formatted = displayValue !== undefined ? displayValue : formatDisplay(localValue, prefix, suffix, capitalize)
    return (
      <div
        className="group flex items-baseline justify-between gap-2 cursor-pointer rounded -mx-1 px-1 hover:bg-slate-800/50 transition-colors"
        onClick={() => setEditing(true)}
      >
        <span className="text-xs text-slate-500 shrink-0">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-xs text-right',
            mono && 'font-mono',
            capitalize && 'capitalize',
            highlight === 'green' && 'text-emerald-400',
            highlight === 'amber' && 'text-amber-400',
            highlight === 'red' && 'text-red-400',
            !highlight && 'text-slate-200',
          )}>
            {formatted ?? '—'}
          </span>
          <Pencil className="h-2.5 w-2.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      </div>
    )
  }

  // Edit mode
  return (
    <div className="flex items-center gap-1.5 -mx-1 px-1">
      <span className="text-xs text-slate-500 shrink-0 w-24">{label}</span>
      <div className="flex-1 flex items-center gap-1">
        {type === 'select' && options ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={(localValue as string) ?? ''}
            onChange={(e) => setLocalValue(e.target.value || null)}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-600"
          >
            <option value="">—</option>
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={(localValue as string) ?? ''}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') cancel() }}
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-600 resize-none"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            step={type === 'number' ? '0.01' : undefined}
            value={localValue != null ? String(localValue) : ''}
            onChange={(e) => {
              const v = e.target.value
              if (type === 'number') {
                setLocalValue(v === '' ? null : parseFloat(v))
              } else {
                setLocalValue(v)
              }
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-600',
              mono && 'font-mono',
            )}
          />
        )}

        {/* Save / Cancel buttons */}
        <button
          onClick={save}
          disabled={saving}
          className="p-0.5 rounded hover:bg-emerald-900/50 text-emerald-500 transition-colors shrink-0"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </button>
        <button
          onClick={cancel}
          className="p-0.5 rounded hover:bg-red-900/50 text-red-400 transition-colors shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  )
}

/** Static InfoRow for non-editable fields (Margin, etc.) */
export function InfoRow({
  label,
  value,
  mono = false,
  capitalize = false,
  highlight,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  capitalize?: boolean
  highlight?: 'green' | 'amber' | 'red'
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={cn(
        'text-xs text-right',
        mono && 'font-mono',
        capitalize && 'capitalize',
        highlight === 'green' && 'text-emerald-400',
        highlight === 'amber' && 'text-amber-400',
        highlight === 'red' && 'text-red-400',
        !highlight && 'text-slate-200',
      )}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function formatDisplay(
  value: string | number | boolean | null | undefined,
  prefix: string,
  suffix: string,
  capitalize: boolean,
): string | null {
  if (value == null || value === '') return null
  let str = String(value)
  if (capitalize) str = str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return `${prefix}${str}${suffix}`
}
