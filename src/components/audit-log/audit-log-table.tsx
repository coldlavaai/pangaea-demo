'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface AuditEntry {
  id: string
  table_name: string
  record_id: string | null
  action: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  user_id: string | null
  changed_by_role: string | null
  created_at: string
}

interface Props {
  entries: AuditEntry[]
  userMap: Record<string, string>
  operativeMap: Record<string, string>
}

const ACTION_STYLES: Record<string, string> = {
  INSERT: 'bg-forest-950/60 text-forest-400 border-forest-900',
  UPDATE: 'bg-amber-950/60 text-amber-400 border-amber-900',
  DELETE: 'bg-red-950/60 text-red-400 border-red-900',
}

const TABLE_LABELS: Record<string, string> = {
  operatives: 'Operative',
  allocations: 'Allocation',
  documents: 'Document',
  timesheets: 'Timesheet',
}

function getDiff(old_values: Record<string, unknown> | null, new_values: Record<string, unknown> | null) {
  if (!old_values || !new_values) return null
  const changed: { key: string; from: unknown; to: unknown }[] = []
  const allKeys = new Set([...Object.keys(old_values), ...Object.keys(new_values)])
  for (const key of allKeys) {
    if (key === 'updated_at') continue
    const oldVal = old_values[key]
    const newVal = new_values[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed.push({ key, from: oldVal, to: newVal })
    }
  }
  return changed
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function getRecordLabel(entry: AuditEntry, operativeMap: Record<string, string>): string {
  const vals = (entry.new_values ?? entry.old_values) as Record<string, unknown> | null
  if (!vals) return '—'
  switch (entry.table_name) {
    case 'operatives':
      return [vals.first_name, vals.last_name].filter(Boolean).join(' ') || '—'
    case 'allocations':
    case 'timesheets': {
      const opId = vals.operative_id as string | undefined
      return opId ? (operativeMap[opId] ?? opId.split('-')[0] + '…') : '—'
    }
    case 'documents':
      return (vals.document_type as string) ?? (vals.title as string) ?? '—'
    default:
      return '—'
  }
}

export function AuditLogTable({ entries, userMap, operativeMap }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tableFilter, setTableFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')

  const filtered = entries.filter((e) => {
    if (tableFilter !== 'all' && e.table_name !== tableFilter) return false
    if (actionFilter !== 'all' && e.action !== actionFilter) return false
    return true
  })

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="h-8 rounded-md border border-border bg-card text-xs text-muted-foreground px-2"
        >
          <option value="all">All tables</option>
          {Object.entries(TABLE_LABELS).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-8 rounded-md border border-border bg-card text-xs text-muted-foreground px-2"
        >
          <option value="all">All actions</option>
          <option value="INSERT">Insert</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>
        <span className="text-xs text-muted-foreground self-center">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/80">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Time</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Action</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Table</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Record</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((entry) => {
              const isExpanded = expanded === entry.id
              const diff = getDiff(entry.old_values, entry.new_values)
              const userName = entry.user_id ? (userMap[entry.user_id] ?? 'Unknown') : 'System'
              const recordLabel = getRecordLabel(entry, operativeMap)

              return (
                <>
                  <tr
                    key={entry.id}
                    className={cn(
                      'hover:bg-background/50 transition-colors cursor-pointer',
                      isExpanded && 'bg-background/50'
                    )}
                    onClick={() => setExpanded(isExpanded ? null : entry.id)}
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.created_at), 'd MMM yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                        ACTION_STYLES[entry.action] ?? 'bg-card text-muted-foreground border-border'
                      )}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {TABLE_LABELS[entry.table_name] ?? entry.table_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-muted-foreground">{recordLabel}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {entry.record_id ? entry.record_id.split('-')[0] + '…' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-muted-foreground">{userName}</div>
                      {entry.changed_by_role && (
                        <div className="text-[10px] text-muted-foreground capitalize">{entry.changed_by_role}</div>
                      )}
                    </td>
                  </tr>

                  {/* Expanded diff row */}
                  {isExpanded && (
                    <tr key={`${entry.id}-detail`} className="bg-background/30">
                      <td colSpan={5} className="px-4 py-3">
                        {entry.action === 'INSERT' && entry.new_values && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Created with</p>
                            {Object.entries(entry.new_values)
                              .filter(([k]) => k !== 'updated_at' && k !== 'created_at')
                              .map(([k, v]) => (
                                <div key={k} className="flex gap-3 text-xs">
                                  <span className="text-muted-foreground w-40 shrink-0">{k}</span>
                                  <span className="text-forest-400">{formatVal(v)}</span>
                                </div>
                              ))}
                          </div>
                        )}
                        {entry.action === 'DELETE' && entry.old_values && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Deleted record</p>
                            {Object.entries(entry.old_values)
                              .filter(([k]) => k !== 'updated_at' && k !== 'created_at')
                              .map(([k, v]) => (
                                <div key={k} className="flex gap-3 text-xs">
                                  <span className="text-muted-foreground w-40 shrink-0">{k}</span>
                                  <span className="text-red-400">{formatVal(v)}</span>
                                </div>
                              ))}
                          </div>
                        )}
                        {entry.action === 'UPDATE' && diff && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                              {diff.length} field{diff.length !== 1 ? 's' : ''} changed
                            </p>
                            {diff.map(({ key, from, to }) => (
                              <div key={key} className="flex gap-3 text-xs items-start">
                                <span className="text-muted-foreground w-40 shrink-0">{key}</span>
                                <span className="text-red-400 line-through">{formatVal(from)}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-forest-400">{formatVal(to)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {entry.action === 'UPDATE' && diff?.length === 0 && (
                          <p className="text-xs text-muted-foreground">No field changes detected</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No audit entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
