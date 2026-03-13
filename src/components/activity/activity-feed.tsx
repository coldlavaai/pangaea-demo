'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ActivityItem } from '@/app/(dashboard)/activity/page'
import {
  MapPin, AlertTriangle, Star, HardHat, LogOut, Info,
  UserPlus, FileCheck, CheckCircle, XCircle, Shield, Clock, FileWarning, Mail, Upload,
} from 'lucide-react'

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; group: string }> = {
  // Telegram
  arrive:               { icon: <MapPin className="h-4 w-4" />,         label: 'Arrived',            group: 'telegram' },
  ncr:                  { icon: <AlertTriangle className="h-4 w-4" />,   label: 'NCR',                group: 'telegram' },
  rap:                  { icon: <Star className="h-4 w-4" />,            label: 'RAP Score',          group: 'telegram' },
  labour_request:       { icon: <HardHat className="h-4 w-4" />,        label: 'Labour Request',     group: 'telegram' },
  finish:               { icon: <LogOut className="h-4 w-4" />,         label: 'Finished',           group: 'telegram' },
  // Applications
  application_complete: { icon: <UserPlus className="h-4 w-4" />,       label: 'New Operative',      group: 'applications' },
  // Documents
  document_uploaded:    { icon: <FileCheck className="h-4 w-4" />,      label: 'ID Uploaded',        group: 'documents' },
  cscs_uploaded:        { icon: <FileCheck className="h-4 w-4" />,      label: 'CSCS Uploaded',      group: 'documents' },
  // Offers
  offer_accepted:       { icon: <CheckCircle className="h-4 w-4" />,    label: 'Offer Accepted',     group: 'offers' },
  offer_declined:       { icon: <XCircle className="h-4 w-4" />,        label: 'Offer Declined',     group: 'offers' },
  // Compliance / cron
  compliance_block:     { icon: <Shield className="h-4 w-4" />,         label: 'Compliance Block',   group: 'compliance' },
  doc_expiring_30:      { icon: <FileWarning className="h-4 w-4" />,    label: 'Doc Expiring (30d)', group: 'compliance' },
  doc_expiring_60:      { icon: <FileWarning className="h-4 w-4" />,    label: 'Doc Expiring (60d)', group: 'compliance' },
  doc_expiring_90:      { icon: <FileWarning className="h-4 w-4" />,    label: 'Doc Expiring (90d)', group: 'compliance' },
  request_ending:       { icon: <Clock className="h-4 w-4" />,          label: 'Request Ending',     group: 'compliance' },
  missing_timesheet:    { icon: <Clock className="h-4 w-4" />,          label: 'Missing Timesheet',  group: 'compliance' },
  goodwill_doc_reminder:{ icon: <FileWarning className="h-4 w-4" />,    label: 'Doc Reminder',       group: 'compliance' },
  // Outgoing email
  email_sent:           { icon: <Mail className="h-4 w-4" />,            label: 'Email Sent',         group: 'email' },
  bulk_import:          { icon: <Upload className="h-4 w-4" />,           label: 'Bulk Import',        group: 'imports' },
}

const TYPE_COLOUR: Record<string, string> = {
  arrive:               'bg-forest-950/60 text-forest-400',
  ncr:                  'bg-red-950/60 text-red-400',
  rap:                  'bg-amber-950/60 text-amber-400',
  labour_request:       'bg-sky-950/60 text-sky-400',
  finish:               'bg-violet-950/60 text-violet-400',
  application_complete: 'bg-forest-950/60 text-forest-400',
  document_uploaded:    'bg-sky-950/60 text-sky-400',
  cscs_uploaded:        'bg-sky-950/60 text-sky-400',
  offer_accepted:       'bg-forest-950/60 text-forest-400',
  offer_declined:       'bg-red-950/60 text-red-400',
  compliance_block:     'bg-red-950/60 text-red-400',
  doc_expiring_30:      'bg-amber-950/60 text-amber-400',
  doc_expiring_60:      'bg-amber-950/60 text-amber-400',
  doc_expiring_90:      'bg-card text-muted-foreground',
  request_ending:       'bg-amber-950/60 text-amber-400',
  missing_timesheet:    'bg-red-950/60 text-red-400',
  goodwill_doc_reminder:'bg-card text-muted-foreground',
  email_sent:           'bg-sky-950/60 text-sky-400',
  bulk_import:          'bg-violet-950/60 text-violet-400',
}

const TYPE_LABEL_COLOUR: Record<string, string> = {
  arrive:               'text-forest-600',
  ncr:                  'text-red-600',
  rap:                  'text-amber-600',
  labour_request:       'text-sky-600',
  finish:               'text-violet-600',
  application_complete: 'text-forest-600',
  document_uploaded:    'text-sky-600',
  cscs_uploaded:        'text-sky-600',
  offer_accepted:       'text-forest-600',
  offer_declined:       'text-red-600',
  compliance_block:     'text-red-600',
  doc_expiring_30:      'text-amber-600',
  doc_expiring_60:      'text-amber-600',
  doc_expiring_90:      'text-muted-foreground',
  request_ending:       'text-amber-600',
  missing_timesheet:    'text-red-600',
  goodwill_doc_reminder:'text-muted-foreground',
  email_sent:           'text-sky-600',
  bulk_import:          'text-violet-600',
}

const SEVERITY_BORDER: Record<string, string> = {
  info:     'border-l-forest-600',
  warning:  'border-l-amber-500',
  critical: 'border-l-red-500',
}

const FILTER_GROUPS = [
  { key: 'all',          label: 'All' },
  { key: 'telegram',     label: 'Telegram' },
  { key: 'applications', label: 'Applications' },
  { key: 'documents',    label: 'Documents' },
  { key: 'offers',       label: 'Offers' },
  { key: 'compliance',   label: 'Compliance' },
  { key: 'email',        label: 'Email' },
  { key: 'imports',      label: 'Imports' },
] as const
type FilterGroup = typeof FILTER_GROUPS[number]['key']

// Collapse bulk_import notifications from the same session into one summary row
function collapseImports(items: ActivityItem[]): ActivityItem[] {
  const SESSION_GAP_MS = 4 * 60 * 60 * 1000 // 4 hours
  const result: ActivityItem[] = []
  let importGroup: ActivityItem[] = []

  const flushGroup = () => {
    if (importGroup.length === 0) return
    if (importGroup.length === 1) {
      result.push(importGroup[0])
    } else {
      let totalImported = 0, totalSkipped = 0, totalFailed = 0
      let filename = ''
      let hasFailed = false
      for (const item of importGroup) {
        const im = item.title.match(/(\d+) operatives added/)
        if (im) totalImported += parseInt(im[1])
        const sm = item.body?.match(/(\d+) skipped/)
        if (sm) totalSkipped += parseInt(sm[1])
        const fm = item.body?.match(/(\d+) failed/)
        if (fm) totalFailed += parseInt(fm[1])
        if (item.severity === 'warning') hasFailed = true
        if (!filename) {
          const fnm = item.body?.match(/File: (.+)/)
          if (fnm) filename = fnm[1]
        }
      }
      const parts = [`${totalImported} operatives added`]
      if (totalSkipped > 0) parts.push(`${totalSkipped} skipped`)
      if (totalFailed > 0) parts.push(`${totalFailed} failed`)
      if (filename) parts.push(`File: ${filename}`)
      if (importGroup.length > 1) parts.push(`${importGroup.length} batches`)
      result.push({
        ...importGroup[0],
        title: `Import complete — ${totalImported} operatives added`,
        body: parts.join(' · '),
        severity: hasFailed ? 'warning' : 'info',
      })
    }
    importGroup = []
  }

  for (const item of items) {
    if (item.type !== 'bulk_import') {
      flushGroup()
      result.push(item)
      continue
    }
    if (importGroup.length === 0) { importGroup.push(item); continue }
    const lastTs = new Date(importGroup[importGroup.length - 1].created_at).getTime()
    const gap = Math.abs(lastTs - new Date(item.created_at).getTime())
    if (gap <= SESSION_GAP_MS) { importGroup.push(item) } else { flushGroup(); importGroup.push(item) }
  }
  flushGroup()
  return result
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function ActivityFeed({ initialItems }: { initialItems: ActivityItem[] }) {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [items, setItems] = useState<ActivityItem[]>(initialItems)
  const [filter, setFilter] = useState<FilterGroup>('all')

  // Live feed — new events push to top
  useEffect(() => {
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `organization_id=eq.${orgId}` },
        (payload) => {
          setItems(prev => [payload.new as ActivityItem, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'email_log', filter: `organization_id=eq.${orgId}` },
        (payload) => {
          const e = payload.new as { id: string; to_email: string; to_name: string | null; subject: string; template: string; status: string; error: string | null; created_at: string }
          const item: ActivityItem = {
            id: e.id,
            type: 'email_sent',
            title: e.subject,
            body: `To: ${e.to_name ? `${e.to_name} <${e.to_email}>` : e.to_email}${e.status === 'failed' ? ` · ⚠️ ${e.error ?? 'Failed'}` : ''}`,
            severity: e.status === 'failed' ? 'warning' : 'info',
            operative_id: null, labour_request_id: null, ncr_id: null, link_url: null,
            read: true,
            created_at: e.created_at,
          }
          setItems(prev => [item, ...prev])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markRead = async (item: ActivityItem) => {
    if (item.type === 'email_sent') return // email log items are always read, no action
    if (!item.read) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('notifications') as any)
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', item.id)
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, read: true } : x))
    }
    if (item.link_url) router.push(item.link_url)
  }

  const collapsed = collapseImports(items)
  const filtered = filter === 'all'
    ? collapsed
    : collapsed.filter(i => (TYPE_META[i.type]?.group ?? 'telegram') === filter)

  const unreadCount = collapsed.filter(i => !i.read).length

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTER_GROUPS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-forest-600 text-white'
                : 'bg-card text-muted-foreground hover:text-muted-foreground hover:bg-[#444444]'
            }`}
          >
            {f.key === 'all' ? `All${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}` : f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Info className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground mt-1">Events will appear here in real time</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden divide-y divide-border/60">
          {filtered.map(item => {
            const meta = TYPE_META[item.type]
            return (
              <button
                key={item.id}
                onClick={() => markRead(item)}
                className={`w-full text-left flex items-start gap-4 px-4 py-3.5 border-l-2 transition-colors hover:bg-card/40 ${
                  SEVERITY_BORDER[item.severity] ?? 'border-l-forest-600'
                } ${item.read ? 'opacity-60' : ''}`}
              >
                {/* Type icon */}
                <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  TYPE_COLOUR[item.type] ?? 'bg-card text-muted-foreground'
                }`}>
                  {meta?.icon ?? <Info className="h-4 w-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-snug ${item.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {item.title}
                    </p>
                    <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(item.created_at)}</span>
                  </div>
                  {item.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-[10px] uppercase tracking-wider font-medium ${
                      TYPE_LABEL_COLOUR[item.type] ?? 'text-muted-foreground'
                    }`}>
                      {meta?.label ?? item.type}
                    </span>
                    {!item.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-forest-500" />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
