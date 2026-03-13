'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MessageSquare, Send } from 'lucide-react'
import { addNcrComment } from '@/app/(dashboard)/ncrs/actions'

interface Comment {
  id: string
  author_name: string
  comment: string
  created_at: string | null
}

interface NcrCommentsSectionProps {
  ncrId: string
  comments: Comment[]
}

export function NcrCommentsSection({ ncrId, comments }: NcrCommentsSectionProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    const { error: err } = await addNcrComment(ncrId, text)
    setSaving(false)
    if (err) { setError(err); return }
    setText('')
    router.refresh()
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        Comments {comments.length > 0 && `(${comments.length})`}
      </div>

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="flex-1 rounded-md bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">{c.author_name}</span>
                  {c.created_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          placeholder="Add a comment…"
          className="flex-1 text-sm"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
          }}
        />
        <Button size="sm" onClick={handleSubmit} disabled={saving || !text.trim()} className="self-end">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Ctrl+Enter to submit</p>
    </div>
  )
}
