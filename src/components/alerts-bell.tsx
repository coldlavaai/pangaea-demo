'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Bell, X, CheckCheck } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  severity: 'info' | 'warning' | 'critical'
  operative_id: string | null
  labour_request_id: string | null
  link_url: string | null
  read: boolean
  created_at: string
}

const severityBorder: Record<string, string> = {
  info:     'border-l-forest-500',
  warning:  'border-l-amber-500',
  critical: 'border-l-red-500',
}

const severityDot: Record<string, string> = {
  info:     'bg-muted',
  warning:  'bg-amber-400',
  critical: 'bg-red-400',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function AlertsBell() {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, severity, operative_id, labour_request_id, link_url, read, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications((data ?? []) as unknown as Notification[])
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live updates — new notification rows appear instantly in the bell
  useEffect(() => {
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `organization_id=eq.${orgId}` },
        (payload) => {
          const n = payload.new as Notification
          setNotifications(prev => [n, ...prev].slice(0, 20))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = async (n: Notification) => {
    if (!n.read) {
      await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', n.id)
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
    if (n.link_url) router.push(n.link_url)
    else if (n.operative_id) router.push(`/operatives/${n.operative_id}`)
    else if (n.labour_request_id) router.push(`/requests/${n.labour_request_id}`)
    setOpen(false)
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications() }}
        className="relative inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-muted-foreground hover:bg-card transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-foreground leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-[9999] w-96 rounded-lg border border-border bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-muted-foreground">
              Notifications {unreadCount > 0 && <span className="ml-1.5 text-xs text-amber-400">({unreadCount} unread)</span>}
            </span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[28rem] overflow-y-auto divide-y divide-border/60">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`w-full text-left px-4 py-3 border-l-2 transition-colors hover:bg-card/50 ${severityBorder[n.severity] ?? 'border-l-forest-500'}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDot[n.severity] ?? 'bg-muted'} ${n.read ? 'opacity-25' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${n.read ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2 text-center">
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              View all activity →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
