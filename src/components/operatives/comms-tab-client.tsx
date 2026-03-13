'use client'

import { useState } from 'react'
import { Search, X, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'Europe/London'

function fmtDateTime(d: string | null) {
  if (!d) return '—'
  return format(toZonedTime(new Date(d), TZ), 'd MMM yyyy, HH:mm')
}

type MessageRow = {
  id: string
  body: string | null
  direction: string
  created_at: string | null
}

type ThreadRow = {
  id: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number | null
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-400/30 text-amber-200 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

export function CommsTabClient({
  messages,
  thread,
}: {
  messages: MessageRow[]
  thread: ThreadRow | null
}) {
  const [query, setQuery] = useState('')

  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">No WhatsApp thread</p>
        <p className="text-xs text-muted-foreground">A conversation will appear here once the operative messages the platform.</p>
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? messages.filter((m) => m.body?.toLowerCase().includes(q))
    : messages

  const sorted = [...filtered].reverse()

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages…"
          className="w-full rounded-lg border border-border bg-card/60 pl-9 pr-8 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-forest-500/50 focus:border-forest-600"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Match count */}
      {q && (
        <p className="text-xs text-muted-foreground">
          {filtered.length === 0
            ? 'No messages match'
            : `${filtered.length} message${filtered.length !== 1 ? 's' : ''} match`}
        </p>
      )}

      {/* Messages */}
      {sorted.length === 0 && !q ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No messages in this thread yet.</div>
      ) : sorted.length === 0 ? null : (
        <div className="flex flex-col gap-2 max-h-[560px] overflow-y-auto pr-1">
          {sorted.map((msg) => {
            const isInbound = msg.direction === 'inbound'
            return (
              <div key={msg.id} className={cn('flex', isInbound ? 'justify-start' : 'justify-end')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                    isInbound
                      ? 'bg-card text-muted-foreground rounded-tl-sm'
                      : 'bg-forest-700 text-white rounded-tr-sm'
                  )}
                >
                  <p className="leading-relaxed">
                    {msg.body ? highlight(msg.body, q) : <span className="opacity-50">(media)</span>}
                  </p>
                  <p className={cn('text-xs mt-1', isInbound ? 'text-muted-foreground' : 'text-forest-200/70')}>
                    {fmtDateTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
