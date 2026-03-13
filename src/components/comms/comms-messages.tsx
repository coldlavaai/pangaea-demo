'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, Search, X } from 'lucide-react'

interface Message {
  id: string
  direction: string | null
  body: string | null
  media_url: string | null
  media_type: string | null
  status: string | null
  error_message: string | null
  created_at: string | null
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-400/30 text-amber-200 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function CommsMessages({ messages }: { messages: Message[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return messages
    const q = query.toLowerCase()
    return messages.filter(m => m.body?.toLowerCase().includes(q))
  }, [messages, query])

  const matchCount = query.trim() ? filtered.length : null

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search messages…"
          className="w-full rounded-md border border-border bg-card/60 pl-9 pr-9 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-forest-600"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {matchCount !== null && (
        <p className="text-xs text-muted-foreground shrink-0">
          {matchCount === 0 ? 'No messages match' : `${matchCount} message${matchCount !== 1 ? 's' : ''} found`}
        </p>
      )}

      {/* Messages */}
      <div className="space-y-3 py-2">
        {filtered.length === 0 && query ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No messages match &ldquo;{query}&rdquo;</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No messages in this thread</div>
        ) : (
          filtered.map((msg) => {
            const isInbound = msg.direction === 'inbound'
            return (
              <div
                key={msg.id}
                className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-sm rounded-2xl px-4 py-2.5 space-y-1 ${
                    isInbound
                      ? 'bg-card border border-border rounded-tl-sm'
                      : 'bg-forest-900/60 border border-forest-800 rounded-tr-sm'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isInbound ? (
                      <><ArrowDownLeft className="h-3 w-3 text-forest-500" /><span>Inbound</span></>
                    ) : (
                      <><ArrowUpRight className="h-3 w-3 text-muted-foreground" /><span>Outbound</span></>
                    )}
                    <span className="ml-auto">
                      {msg.created_at ? format(new Date(msg.created_at), 'd MMM HH:mm') : ''}
                    </span>
                  </div>

                  {msg.body && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {highlightMatch(msg.body, query)}
                    </p>
                  )}

                  {msg.media_url && (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-forest-400 hover:underline block mt-1">
                      📎 {msg.media_type ?? 'Attachment'}
                    </a>
                  )}

                  {msg.error_message && (
                    <p className="text-xs text-red-400 mt-1">⚠ {msg.error_message}</p>
                  )}

                  {!isInbound && msg.status && msg.status !== 'sent' && (
                    <p className="text-xs text-muted-foreground">{msg.status}</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
