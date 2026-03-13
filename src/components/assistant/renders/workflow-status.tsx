'use client'

import { useState, useEffect, useCallback } from 'react'

interface ChecklistItem {
  key: string
  label: string
  type: 'data' | 'document'
  done: boolean
}

interface WorkflowStatusData {
  run_id: string
  workflow_type: string
  status: string
  total_targets: number
  targets_contacted?: number
  targets_completed: number
  targets_failed?: number
  created_at?: string
  checklist?: ChecklistItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  targets?: any[]
}

const STATUS_PILL: Record<string, string> = {
  active:    'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-muted/20 text-muted-foreground',
  failed:    'bg-red-500/20 text-red-400',
  paused:    'bg-amber-500/20 text-amber-400',
}

export function WorkflowStatus({ data }: { data: WorkflowStatusData }) {
  const [live, setLive] = useState(data)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/assistant/workflow-status/${live.run_id}`)
      if (res.ok) {
        const updated = await res.json()
        setLive(updated)
      }
    } catch { /* silently retry next interval */ }
  }, [live.run_id])

  // Poll every 5 seconds while active
  useEffect(() => {
    if (live.status !== 'active') return
    // Initial poll after 2s to pick up any immediate completions
    const initial = setTimeout(poll, 2000)
    const interval = setInterval(poll, 5000)
    return () => { clearTimeout(initial); clearInterval(interval) }
  }, [live.status, live.run_id, poll])

  const {
    workflow_type,
    status,
    total_targets,
    targets_contacted = 0,
    targets_completed = 0,
    targets_failed = 0,
    checklist = [],
  } = live

  const typeLabel = workflow_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  const resolved = targets_completed + targets_failed
  const isSingleTarget = total_targets === 1
  const doneCount = checklist.filter(i => i.done).length
  const totalItems = checklist.length
  const progressPct = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0

  return (
    <div className="my-2 bg-card/60 rounded-lg border border-border/50 overflow-hidden text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-card/40 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-muted-foreground">{typeLabel}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_PILL[status] ?? 'bg-[#444444] text-muted-foreground'}`}>
            {status}
          </span>
        </div>
        {status === 'active' && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            live
          </span>
        )}
      </div>

      {/* Checklist — shows each requested item */}
      {checklist.length > 0 ? (
        <div className="px-3 py-2.5 space-y-1">
          {checklist.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <span className={`w-4 text-center text-sm ${item.done ? 'text-forest-400' : 'text-muted-foreground'}`}>
                {item.done ? '✓' : '○'}
              </span>
              <span className={item.done ? 'text-muted-foreground line-through' : 'text-muted-foreground'}>
                {item.label}
              </span>
              <span className={`text-[10px] ml-auto ${item.type === 'document' ? 'text-amber-500/60' : 'text-muted-foreground'}`}>
                {item.type === 'document' ? 'upload' : 'data'}
              </span>
            </div>
          ))}
        </div>
      ) : isSingleTarget ? (
        /* Fallback step view when no checklist data */
        <div className="px-3 py-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-4 text-center text-forest-400">✓</span>
            <span className="text-muted-foreground">Workflow created</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-4 text-center ${targets_contacted > 0 ? 'text-forest-400' : 'text-muted-foreground'}`}>
              {targets_contacted > 0 ? '✓' : '○'}
            </span>
            <span className={targets_contacted > 0 ? 'text-muted-foreground' : 'text-muted-foreground'}>
              WhatsApp sent
              {targets_contacted > 0 && status === 'active' && <span className="ml-1.5 inline-block w-1 h-1 bg-blue-400 rounded-full animate-pulse" />}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-4 text-center ${status === 'completed' ? 'text-forest-400' : 'text-muted-foreground'}`}>
              {status === 'completed' ? '✓' : '○'}
            </span>
            <span className={status === 'completed' ? 'text-muted-foreground' : 'text-muted-foreground'}>All items submitted</span>
          </div>
        </div>
      ) : (
        /* Multi-target stats grid */
        <div className="grid grid-cols-3 divide-x divide-border text-center py-2">
          <div>
            <div className="text-sm font-semibold text-blue-400">{targets_contacted}</div>
            <div className="text-[10px] text-muted-foreground">sent</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-green-400">{targets_completed}</div>
            <div className="text-[10px] text-muted-foreground">complete</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-muted-foreground">{total_targets - resolved}</div>
            <div className="text-[10px] text-muted-foreground">pending</div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {totalItems > 0 && (
        <div className="px-3 pb-2.5">
          <div className="h-1.5 bg-[#444444] rounded-full overflow-hidden">
            <div
              className="h-full bg-forest-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">{doneCount} of {totalItems} items</span>
            <span className="text-[10px] text-muted-foreground">{progressPct}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
