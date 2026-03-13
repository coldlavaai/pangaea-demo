'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, Phone, Search, X } from 'lucide-react'
import { StatusBadge } from '@/components/status-badge'

const INTAKE_LABELS: Record<string, string> = {
  start:                'Starting',
  awaiting_rtw:         'Awaiting RTW',
  awaiting_age:         'Awaiting Age',
  awaiting_cscs:        'Awaiting CSCS',
  awaiting_trade:       'Awaiting Trade',
  awaiting_experience:  'Awaiting Experience',
  awaiting_name:        'Awaiting Name',
  awaiting_email:       'Awaiting Email',
  docs_link_sent:       'Docs Pending',
  qualified:            'Qualified',
  rejected:             'Rejected',
}

interface Thread {
  id: string
  phone_number: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number | null
  intake_state: string | null
  operative: {
    id: string
    first_name: string
    last_name: string
    reference_number: string | null
    status: string | null
  } | null
}

export function CommsThreadList({ threads }: { threads: Thread[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return threads
    const q = query.toLowerCase()
    return threads.filter(t => {
      const op = t.operative
      const name = op ? `${op.first_name} ${op.last_name}`.toLowerCase() : ''
      return (
        name.includes(q) ||
        t.phone_number.toLowerCase().includes(q) ||
        t.last_message?.toLowerCase().includes(q) ||
        op?.reference_number?.toLowerCase().includes(q)
      )
    })
  }, [threads, query])

  const totalUnread = threads.reduce((sum, t) => sum + (t.unread_count ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Stats + search row */}
      <div className="flex items-center gap-4">
        <div className="flex gap-4 text-sm shrink-0">
          <span className="text-slate-400">
            {threads.length} thread{threads.length !== 1 ? 's' : ''}
          </span>
          {totalUnread > 0 && (
            <span className="text-emerald-400 font-medium">{totalUnread} unread</span>
          )}
        </div>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, number, message…"
            className="w-full rounded-md border border-slate-700 bg-slate-800/60 pl-9 pr-9 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Thread list */}
      {threads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 p-16 text-center">
          <MessageCircle className="h-8 w-8 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No conversations yet</p>
          <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
            Messages will appear here once the WhatsApp webhook is live and operatives start responding to offers.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 p-12 text-center">
          <p className="text-slate-500 text-sm">No threads match &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 divide-y divide-slate-800 overflow-hidden">
          {filtered.map((thread) => {
            const op = thread.operative
            return (
              <Link
                key={thread.id}
                href={`/comms/${thread.id}`}
                className="flex items-start gap-4 px-4 py-3.5 hover:bg-slate-900/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-slate-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium text-slate-200 truncate">
                      {op ? `${op.first_name} ${op.last_name}` : thread.phone_number}
                    </div>
                    {thread.last_message_at && (
                      <span className="text-xs text-slate-600 shrink-0">
                        {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {op?.reference_number && (
                      <span className="text-xs font-mono text-slate-600">{op.reference_number}</span>
                    )}
                    {!op && (
                      <span className="text-xs text-slate-600 font-mono">{thread.phone_number}</span>
                    )}
                    {op?.status && <StatusBadge status={op.status} />}
                    {thread.intake_state && thread.intake_state !== 'qualified' && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                        thread.intake_state === 'rejected'
                          ? 'bg-red-900/40 text-red-400 border-red-800'
                          : thread.intake_state === 'docs_link_sent'
                            ? 'bg-sky-900/40 text-sky-400 border-sky-800'
                            : 'bg-amber-900/40 text-amber-400 border-amber-800'
                      }`}>
                        {INTAKE_LABELS[thread.intake_state] ?? thread.intake_state}
                      </span>
                    )}
                  </div>
                  {thread.last_message && (
                    <p className="text-sm text-slate-500 mt-1 truncate">{thread.last_message}</p>
                  )}
                </div>

                {(thread.unread_count ?? 0) > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-medium flex items-center justify-center shrink-0 mt-1">
                    {thread.unread_count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
