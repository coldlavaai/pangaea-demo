'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SSEEvent, RichBlock, AssistantConversation } from '@/lib/assistant/types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  richBlocks?: RichBlock[]
  isStreaming?: boolean
  pendingConfirmation?: {
    id: string
    tool: string
    action: string
    summary: string
    input: Record<string, unknown>
  } | null
}

const STORAGE_KEY_MESSAGES = 'rex-widget-messages'
const STORAGE_KEY_CONV_ID = 'rex-widget-conversation-id'

function loadPersistedMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_MESSAGES)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatMessage[]
    // Clear streaming state from persisted messages
    return parsed.map(m => ({ ...m, isStreaming: false, pendingConfirmation: null }))
  } catch {
    return []
  }
}

function loadPersistedConversationId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(STORAGE_KEY_CONV_ID) ?? null
}

export function useAssistantStream() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadPersistedMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(loadPersistedConversationId)
  const [conversations, setConversations] = useState<AssistantConversation[]>([])
  const abortRef = useRef<AbortController | null>(null)

  // Persist messages and conversationId to sessionStorage on changes
  useEffect(() => {
    try {
      // Only persist non-streaming messages (avoid saving mid-stream partial content)
      const toSave = messages.filter(m => !m.isStreaming)
      if (toSave.length > 0) {
        sessionStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(toSave))
      } else {
        sessionStorage.removeItem(STORAGE_KEY_MESSAGES)
      }
    } catch { /* sessionStorage full or unavailable */ }
  }, [messages])

  useEffect(() => {
    try {
      if (conversationId) {
        sessionStorage.setItem(STORAGE_KEY_CONV_ID, conversationId)
      } else {
        sessionStorage.removeItem(STORAGE_KEY_CONV_ID)
      }
    } catch { /* ignore */ }
  }, [conversationId])

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/assistant/conversations')
    if (res.ok) {
      const data = await res.json()
      setConversations(data.conversations ?? [])
    }
  }, [])

  const loadConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/assistant/conversations/${id}`)
    if (!res.ok) return
    const data = await res.json()
    const loaded: ChatMessage[] = (data.messages ?? []).map((m: { id: string; role: 'user' | 'assistant'; content: string; rich_data?: RichBlock[] | null }) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      richBlocks: m.rich_data ?? [],
    }))
    setMessages(loaded)
    setConversationId(id)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsgId = `user-${Date.now()}`
    const assistantMsgId = `asst-${Date.now()}`

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: text },
      { id: assistantMsgId, role: 'assistant', content: '', richBlocks: [], isStreaming: true },
    ])
    setIsLoading(true)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error('Failed to connect to assistant')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6)) as SSEEvent

            if (event.type === 'text_delta') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: m.content + event.content } : m
              ))
            } else if (event.type === 'tool_result') {
              setMessages(prev => prev.map(m => {
                if (m.id !== assistantMsgId) return m
                const newBlock: RichBlock = { type: event.render_type, data: event.data }
                // Deduplicate: skip if identical block already in this message
                const isDuplicate = (m.richBlocks ?? []).some(
                  b => b.type === newBlock.type && JSON.stringify(b.data) === JSON.stringify(newBlock.data)
                )
                if (isDuplicate) return m
                return { ...m, richBlocks: [...(m.richBlocks ?? []), newBlock] }
              }))
            } else if (event.type === 'confirmation_required') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, pendingConfirmation: { id: event.id, tool: event.tool, action: event.action, summary: event.summary, input: event.input } }
                  : m
              ))
            } else if (event.type === 'done') {
              setConversationId(event.conversationId)
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId ? { ...m, isStreaming: false, id: event.messageId || m.id } : m
              ))
              loadConversations()
            } else if (event.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content || `Error: ${event.message}`, isStreaming: false }
                  : m
              ))
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: 'Connection error. Please try again.', isStreaming: false }
            : m
        ))
      }
    } finally {
      setIsLoading(false)
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId && m.isStreaming ? { ...m, isStreaming: false } : m
      ))
    }
  }, [isLoading, conversationId, loadConversations])

  const confirm = useCallback(async (messageId: string, confirmed: boolean) => {
    const msg = messages.find(m => m.id === messageId)
    if (!msg?.pendingConfirmation) return

    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, pendingConfirmation: null } : m
    ))

    if (!confirmed) {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: m.content + '\n\n*Action cancelled.*' } : m
      ))
      return
    }

    try {
      const res = await fetch('/api/assistant/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          tool: msg.pendingConfirmation.tool,
          input: msg.pendingConfirmation.input,
          confirmed: true,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, content: m.content + `\n\n**Error:** ${data.error ?? 'Action failed. Check the logs.'}` } : m
        ))
        return
      }

      // Show the result text + rich card from the executor
      const resultText = data.result?.text_result ?? 'Action completed.'
      const richBlock = data.result?.rich_result ?? null

      setMessages(prev => prev.map(m =>
        m.id === messageId ? {
          ...m,
          content: m.content + `\n\n${resultText}`,
          richBlocks: richBlock ? [...(m.richBlocks ?? []), richBlock] : m.richBlocks,
        } : m
      ))
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, content: m.content + '\n\n**Error:** Failed to execute action. Please try again.' } : m
      ))
    }
  }, [messages, conversationId])

  const startNewConversation = useCallback(() => {
    setMessages([])
    setConversationId(null)
    try {
      sessionStorage.removeItem(STORAGE_KEY_MESSAGES)
      sessionStorage.removeItem(STORAGE_KEY_CONV_ID)
    } catch { /* ignore */ }
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    await fetch(`/api/assistant/conversations/${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.id !== id))
    if (conversationId === id) startNewConversation()
  }, [conversationId, startNewConversation])

  return {
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
  }
}
