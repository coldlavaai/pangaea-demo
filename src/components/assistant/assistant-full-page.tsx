'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ConversationList } from './conversation-list'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { QuickActions } from './quick-actions'
import { useAssistantStream } from './use-assistant-stream'

export function AssistantFullPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Track which conversation ID we last loaded so URL updates we trigger ourselves don't re-load
  const loadedConvRef = useRef<string | null>(null)
  const {
    messages,
    isLoading,
    conversationId,
    conversations,
    sendMessage,
    confirm,
    loadConversations,
    loadConversation,
    startNewConversation,
    deleteConversation,
  } = useAssistantStream()

  // Load conversation from URL param — only when it's an external navigation (not our own URL updates)
  useEffect(() => {
    const convId = searchParams.get('conversation')
    if (convId && convId !== loadedConvRef.current) {
      loadedConvRef.current = convId
      loadConversation(convId)
    }
  }, [searchParams, loadConversation])

  // Update URL when conversation changes
  useEffect(() => {
    if (conversationId) {
      router.replace(`/assistant?conversation=${conversationId}`, { scroll: false })
    }
  }, [conversationId, router])

  const handleSelect = useCallback((id: string) => {
    loadedConvRef.current = id
    loadConversation(id)
  }, [loadConversation])

  const handleNew = useCallback(() => {
    loadedConvRef.current = null  // allow next conversation to be loaded from URL
    startNewConversation()
    router.replace('/assistant', { scroll: false })
  }, [startNewConversation, router])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Conversation list sidebar */}
      <ConversationList
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={deleteConversation}
        onLoad={loadConversations}
      />

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
          <span className="text-sm font-semibold text-slate-200">Rex</span>
          <span className="text-xs text-slate-500">Pangaea AI</span>
        </div>

        {messages.length === 0 ? (
          <div className="flex-1 overflow-y-auto">
            <QuickActions onSelect={sendMessage} />
          </div>
        ) : (
          <MessageList messages={messages} onConfirm={confirm} onAction={sendMessage} />
        )}

        {/* Input */}
        <div className="p-3 border-t border-slate-800">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
          <p className="text-[10px] text-slate-600 text-center mt-1">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}
