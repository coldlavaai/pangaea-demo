'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble } from './message-bubble'
import type { ChatMessage } from './use-assistant-stream'

interface MessageListProps {
  messages: ChatMessage[]
  onConfirm: (messageId: string, confirmed: boolean) => void
  onAction?: (message: string) => void
}

export function MessageList({ messages, onConfirm, onAction }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} onConfirm={onConfirm} onAction={onAction} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
