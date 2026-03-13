'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sparkles, X, ExternalLink, ChevronDown, Plus } from 'lucide-react'
import { ChatInput } from './chat-input'
import { MessageList } from './message-list'
import { useAssistantStream } from './use-assistant-stream'

export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const { messages, isLoading, conversationId, sendMessage, confirm, startNewConversation } = useAssistantStream()

  // Close widget when navigating to assistant page
  useEffect(() => {
    if (pathname === '/assistant') setOpen(false)
  }, [pathname])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleOpenFullPage = useCallback(() => {
    if (conversationId) {
      router.push(`/assistant?conversation=${conversationId}`)
    } else {
      router.push('/assistant')
    }
    setOpen(false)
  }, [conversationId, router])

  // Listen for toggle-rex custom event from sidebar
  useEffect(() => {
    const handler = () => setOpen(prev => !prev)
    window.addEventListener('toggle-rex', handler)
    return () => window.removeEventListener('toggle-rex', handler)
  }, [])

  // Don't render on assistant page
  if (pathname === '/assistant') return null

  if (!open) return null

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="w-[380px] h-[500px] flex flex-col bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200 flex-1">Rex</span>
          {messages.length > 0 && (
            <button
              onClick={startNewConversation}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="New chat"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleOpenFullPage}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title="Open full view"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-4">
                <Sparkles className="h-8 w-8 text-emerald-500/30 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Ask anything about your workforce</p>
                <p className="text-[10px] text-slate-600 mt-1">Cmd+K to toggle</p>
              </div>
            </div>
          ) : (
            <MessageList messages={messages} onConfirm={confirm} onAction={sendMessage} />
          )}
        </div>

        {/* Input */}
        <div className="p-2 border-t border-slate-800">
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            placeholder="Quick question..."
          />
        </div>
      </div>
    </div>
  )
}
