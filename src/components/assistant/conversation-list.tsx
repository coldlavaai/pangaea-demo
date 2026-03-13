'use client'

import { useEffect } from 'react'
import { Plus, Trash2, MessageSquare } from 'lucide-react'
import type { AssistantConversation } from '@/lib/assistant/types'
import { cn } from '@/lib/utils'

interface ConversationListProps {
  conversations: AssistantConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onLoad: () => void
}

export function ConversationList({ conversations, activeId, onSelect, onNew, onDelete, onLoad }: ConversationListProps) {
  useEffect(() => { onLoad() }, [onLoad])

  return (
    <div className="flex flex-col h-full w-52 shrink-0 bg-slate-900/50 border-r border-slate-800">
      <div className="p-2 border-b border-slate-800">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 rounded-lg text-xs text-emerald-400 font-medium transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-xs text-slate-500 px-2 py-4 text-center">No conversations yet</p>
        )}
        {conversations.map(conv => (
          <div
            key={conv.id}
            className={cn(
              'group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors',
              activeId === conv.id
                ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 pl-[6px]'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            )}
            onClick={() => onSelect(conv.id)}
          >
            <MessageSquare className="h-3 w-3 shrink-0 opacity-60" />
            <span className="flex-1 truncate text-xs">{conv.title}</span>
            <button
              onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
              className="text-slate-700 hover:text-red-400 transition-colors"
              title="Delete conversation"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
