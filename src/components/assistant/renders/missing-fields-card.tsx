'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface MissingItem {
  key: string
  label: string
}

interface MissingFieldsData {
  operative_id: string
  operative_name: string
  ref: string
  trade: string | null
  status: string
  required: MissingItem[]
  optional: MissingItem[]
  documents: MissingItem[]
  pending_documents?: MissingItem[]
  present: string[]
}

// Maps DB column names from the card to DataForm field keys
const DB_KEY_TO_FORM_KEY: Record<string, string> = {
  bank_sort_code: 'bank_details',
  bank_account_number: 'bank_details',
  address_line1: 'address',
  utr_number: 'utr',
  next_of_kin_name: 'nok_name',
  next_of_kin_phone: 'nok_phone',
}

function normalizeDataFields(items: MissingItem[]): string[] {
  const mapped = items.map(i => DB_KEY_TO_FORM_KEY[i.key] ?? i.key)
  return [...new Set(mapped)] // dedupe (e.g. bank_sort_code + bank_account_number → bank_details once)
}

export function MissingFieldsCard({ data, onAction }: { data: MissingFieldsData; onAction?: (msg: string) => void }) {
  const allItems = [
    ...data.required.map(i => ({ ...i, group: 'data' as const })),
    ...data.optional.map(i => ({ ...i, group: 'data' as const })),
    ...data.documents.map(i => ({ ...i, group: 'doc' as const })),
  ]
  const [checked, setChecked] = useState<Set<string>>(new Set(allItems.map(i => i.key)))

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const checkedData = [...data.required, ...data.optional].filter(i => checked.has(i.key))
  const checkedDocs = data.documents.filter(i => checked.has(i.key))
  const hasAction = checkedData.length > 0 || checkedDocs.length > 0

  function handleAction() {
    if (!onAction) return
    const normalizedFields = normalizeDataFields(checkedData)
    const docKeys = checkedDocs.map(i => i.key)
    // Compose a single unambiguous instruction for Rex to trigger ONE profile_completion workflow
    const fieldsPart = normalizedFields.length > 0 ? `data_fields: [${normalizedFields.join(', ')}]` : ''
    const docsPart = docKeys.length > 0 ? `document_types: [${docKeys.join(', ')}]` : ''
    const params = [fieldsPart, docsPart].filter(Boolean).join(', ')
    onAction(
      `Trigger a profile_completion workflow for operative ${data.operative_id} (${data.operative_name}) with ${params}. Send one WhatsApp link covering everything selected.`
    )
  }

  const totalMissing = allItems.length

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-900/40">
        <div>
          <span className="font-medium text-slate-200">{data.operative_name}</span>
          <span className="text-slate-500 ml-2">{data.ref} · {data.trade ?? 'No trade'} · {data.status}</span>
          {totalMissing > 0 && (
            <span className="ml-2 text-[10px] text-amber-400/80">— {totalMissing} item{totalMissing !== 1 ? 's' : ''} outstanding</span>
          )}
        </div>
        <Link href={`/operatives/${data.operative_id}`} className="text-slate-500 hover:text-emerald-400 transition-colors">
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {totalMissing === 0 ? (
        <div className="px-3 py-3 text-emerald-400 font-medium">✓ Profile complete</div>
      ) : (
        <>
          <div className="px-3 py-2 space-y-3">
            {data.required.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">Missing — Required</p>
                <div className="space-y-0.5">
                  {data.required.map(item => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer group py-0.5">
                      <input
                        type="checkbox"
                        checked={checked.has(item.key)}
                        onChange={() => toggle(item.key)}
                        className="w-3 h-3 accent-amber-500 rounded"
                      />
                      <span className={`transition-colors ${checked.has(item.key) ? 'text-slate-300 group-hover:text-slate-100' : 'text-slate-600 line-through'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {data.optional.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Missing — Optional</p>
                <div className="space-y-0.5">
                  {data.optional.map(item => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer group py-0.5">
                      <input
                        type="checkbox"
                        checked={checked.has(item.key)}
                        onChange={() => toggle(item.key)}
                        className="w-3 h-3 accent-slate-400 rounded"
                      />
                      <span className={`transition-colors ${checked.has(item.key) ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-600 line-through'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {data.documents.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Missing Documents</p>
                <div className="space-y-0.5">
                  {data.documents.map(item => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer group py-0.5">
                      <input
                        type="checkbox"
                        checked={checked.has(item.key)}
                        onChange={() => toggle(item.key)}
                        className="w-3 h-3 accent-amber-500 rounded"
                      />
                      <span className={`transition-colors ${checked.has(item.key) ? 'text-slate-300 group-hover:text-slate-100' : 'text-slate-600 line-through'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(data.pending_documents ?? []).length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1">Needs Verifying</p>
                <div className="space-y-0.5">
                  {(data.pending_documents ?? []).map(item => (
                    <div key={item.key} className="flex items-center gap-2 py-0.5">
                      <span className="w-3 h-3 flex items-center justify-center text-purple-400 text-[10px]">⏳</span>
                      <span className="text-purple-300">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.present.length > 0 && (
              <p className="text-[10px] text-slate-600 pt-1 border-t border-slate-700/50">
                ✓ {data.present.join(' · ')}
              </p>
            )}
          </div>

          {/* Action bar */}
          <div className="px-3 py-2 border-t border-slate-700/50 bg-slate-900/30 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">{checked.size} of {totalMissing} selected</span>
            <button
              onClick={handleAction}
              disabled={!hasAction || !onAction}
              className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-400 rounded-md text-[10px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Action selected →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
