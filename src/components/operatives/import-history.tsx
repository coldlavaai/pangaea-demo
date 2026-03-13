'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, AlertTriangle, XCircle, Copy, CheckCircle } from 'lucide-react'
import type { ImportLog } from '@/app/(dashboard)/operatives/import/history/page'

interface Props {
  logs: ImportLog[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="ml-1 text-slate-500 hover:text-slate-300 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

function SkippedRowsTable({ rows }: { rows: NonNullable<ImportLog['skipped_rows']> }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="border border-slate-700 rounded overflow-hidden">
      <div className="bg-slate-800/60 px-3 py-2 text-xs font-medium text-red-400 uppercase tracking-wide">
        Skipped rows ({rows.length})
      </div>
      <div className="divide-y divide-slate-700/50">
        {rows.map((r, i) => (
          <div key={i}>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800/40 transition-colors"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="text-slate-500 text-xs w-8 shrink-0">#{r.row}</span>
              <span className="text-slate-200 text-sm font-medium flex-1">{r.name}</span>
              {r.isDuplicate && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 shrink-0">Duplicate</span>
              )}
              {r.errors.length > 0 && !r.isDuplicate && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 shrink-0">
                  {r.errors.length} error{r.errors.length !== 1 ? 's' : ''}
                </span>
              )}
              {r.ni && <span className="text-slate-500 text-xs shrink-0">{r.ni}</span>}
              {open === i
                ? <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                : <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              }
            </button>
            {open === i && (
              <div className="px-3 pb-3 pt-1 bg-slate-900/40 space-y-2">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-400">
                  {r.phone && <div><span className="text-slate-500">Phone:</span> {r.phone} <CopyButton text={r.phone} /></div>}
                  {r.ni && <div><span className="text-slate-500">NI:</span> {r.ni} <CopyButton text={r.ni} /></div>}
                  {r.trade && <div><span className="text-slate-500">Trade:</span> {r.trade}</div>}
                </div>
                {r.errors.length > 0 && (
                  <div className="space-y-1">
                    {r.errors.map((e, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs text-red-300">
                        <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
                        {e}
                      </div>
                    ))}
                  </div>
                )}
                {r.warnings.length > 0 && (
                  <div className="space-y-1">
                    {r.warnings.map((w, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                        {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function WarnedRowsTable({ rows }: { rows: NonNullable<ImportLog['warned_rows']> }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="border border-slate-700 rounded overflow-hidden">
      <div className="bg-slate-800/60 px-3 py-2 text-xs font-medium text-amber-400 uppercase tracking-wide">
        Imported with warnings ({rows.length})
      </div>
      <div className="divide-y divide-slate-700/50">
        {rows.map((r, i) => (
          <div key={i}>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800/40 transition-colors"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="text-slate-500 text-xs w-8 shrink-0">#{r.row}</span>
              <span className="text-slate-200 text-sm font-medium flex-1">{r.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 shrink-0">
                {r.warnings.length} warning{r.warnings.length !== 1 ? 's' : ''}
              </span>
              {r.ni && <span className="text-slate-500 text-xs shrink-0">{r.ni}</span>}
              {open === i
                ? <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                : <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              }
            </button>
            {open === i && (
              <div className="px-3 pb-3 pt-1 bg-slate-900/40 space-y-2">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-400">
                  {r.phone && <div><span className="text-slate-500">Phone:</span> {r.phone} <CopyButton text={r.phone} /></div>}
                  {r.ni && <div><span className="text-slate-500">NI:</span> {r.ni} <CopyButton text={r.ni} /></div>}
                  {r.trade && <div><span className="text-slate-500">Trade:</span> {r.trade}</div>}
                </div>
                <div className="space-y-1">
                  {r.warnings.map((w, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ImportLogCard({ log }: { log: ImportLog }) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'skipped' | 'warned'>('skipped')

  const hasDetail = (log.skipped_rows && log.skipped_rows.length > 0) ||
                    (log.warned_rows && log.warned_rows.length > 0)

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900/40">
      {/* Summary row */}
      <button
        className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-slate-800/30 transition-colors"
        onClick={() => hasDetail && setExpanded(e => !e)}
        disabled={!hasDetail}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-200 text-sm font-medium truncate">{log.filename}</span>
            {log.importer_name && (
              <span className="text-slate-500 text-xs">— {log.importer_name}</span>
            )}
          </div>
          <div className="text-slate-500 text-xs mt-0.5">{formatDate(log.created_at)}</div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs">
          <span className="text-emerald-400 font-medium">{log.created_count} added</span>
          {log.skipped_count > 0 && <span className="text-red-400">{log.skipped_count} skipped</span>}
          {(log.warned_rows?.length ?? 0) > 0 && <span className="text-amber-400">{log.warned_rows!.length} warned</span>}
          <span className="text-slate-600">of {log.total_rows}</span>
        </div>

        {hasDetail && (
          expanded
            ? <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
        )}
      </button>

      {/* Detail panel */}
      {expanded && hasDetail && (
        <div className="border-t border-slate-700 p-4 space-y-4">
          {/* Tab selector */}
          {log.skipped_rows && log.skipped_rows.length > 0 && log.warned_rows && log.warned_rows.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setTab('skipped')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  tab === 'skipped'
                    ? 'bg-red-950/60 text-red-300 border border-red-800/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Skipped ({log.skipped_rows.length})
              </button>
              <button
                onClick={() => setTab('warned')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  tab === 'warned'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Warned ({log.warned_rows.length})
              </button>
            </div>
          )}

          {/* Skipped rows */}
          {(tab === 'skipped' || !log.warned_rows?.length) && log.skipped_rows && log.skipped_rows.length > 0 && (
            <SkippedRowsTable rows={log.skipped_rows} />
          )}

          {/* Warned rows */}
          {(tab === 'warned' || !log.skipped_rows?.length) && log.warned_rows && log.warned_rows.length > 0 && (
            <WarnedRowsTable rows={log.warned_rows} />
          )}

          {/* DB-level insert errors (rare) */}
          {log.errors && log.errors.length > 0 && (
            <div className="border border-red-800/40 rounded overflow-hidden">
              <div className="bg-red-950/40 px-3 py-2 text-xs font-medium text-red-400 uppercase tracking-wide">
                DB Insert Errors ({log.errors.length})
              </div>
              <div className="divide-y divide-slate-700/50">
                {log.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs text-red-300">
                    <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
                    <span className="text-slate-500 w-6 shrink-0">#{e.row}</span>
                    {e.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ImportHistory({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        No imports yet. Run a bulk import from the{' '}
        <Link href="/operatives/import" className="text-slate-300 underline underline-offset-2">import page</Link>.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map(log => (
        <ImportLogCard key={log.id} log={log} />
      ))}
    </div>
  )
}
