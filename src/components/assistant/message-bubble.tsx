'use client'

import { RichRenderer } from './rich-renderer'
import { ConfirmationCard } from './confirmation-card'
import type { ChatMessage } from './use-assistant-stream'
import type { RichBlock } from '@/lib/assistant/types'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: ChatMessage
  onConfirm: (messageId: string, confirmed: boolean) => void
  onAction?: (message: string) => void
}

function renderInline(text: string): React.ReactNode[] {
  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<p key={i} className="font-semibold text-slate-200 text-xs mt-2 mb-0.5">{renderInline(line.slice(4))}</p>)
    } else if (line.startsWith('## ')) {
      elements.push(<p key={i} className="font-semibold text-slate-100 text-sm mt-2 mb-0.5">{renderInline(line.slice(3))}</p>)
    } else if (line.startsWith('# ')) {
      elements.push(<p key={i} className="font-semibold text-slate-100 mt-2 mb-0.5">{renderInline(line.slice(2))}</p>)
    }
    // Bullet list
    else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(<p key={i} className="pl-3 text-slate-300">• {renderInline(line.slice(2))}</p>)
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      elements.push(<p key={i} className="pl-3 text-slate-300">{renderInline(line)}</p>)
    }
    // Horizontal rule
    else if (line.trim() === '---') {
      elements.push(<hr key={i} className="border-slate-700 my-2" />)
    }
    // Table row — skip separator rows, render data rows as plain text for now
    else if (line.startsWith('|') && line.trim().replace(/[\s|:-]/g, '') === '') {
      // skip separator row
    }
    // Empty line
    else if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />)
    }
    // Normal paragraph
    else {
      elements.push(<p key={i} className="text-slate-300">{renderInline(line)}</p>)
    }
    i++
  }

  return (
    <div className="text-sm leading-relaxed space-y-0.5">
      {elements}
    </div>
  )
}

export function MessageBubble({ message, onConfirm, onAction }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%]', isUser ? 'max-w-[70%]' : 'w-full')}>
        {isUser ? (
          <div className="bg-emerald-600/20 border border-emerald-600/30 rounded-2xl rounded-tr-sm px-3 py-2">
            <p className="text-sm text-slate-100">{message.content}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Loading indicator — shown before any content arrives */}
            {!message.content && !message.richBlocks?.length && message.isStreaming && (
              <div className="bg-slate-800/60 rounded-2xl rounded-tl-sm px-3 py-2">
                <div className="flex gap-1 py-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            {/* Text first (pre-tool narration), then rich cards below */}
            {message.content && (
              <div className="bg-slate-800/60 rounded-2xl rounded-tl-sm px-3 py-2">
                <SimpleMarkdown text={message.content} />
                {message.isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-emerald-400 animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
            )}
            {/* Rich data cards below the text */}
            {(message.richBlocks ?? []).map((block: RichBlock, i: number) => (
              <RichRenderer key={i} block={block} onAction={onAction} />
            ))}
            {message.pendingConfirmation && (
              <ConfirmationCard
                summary={message.pendingConfirmation.summary}
                tool={message.pendingConfirmation.tool}
                action={message.pendingConfirmation.action}
                onConfirm={() => onConfirm(message.id, true)}
                onCancel={() => onConfirm(message.id, false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
