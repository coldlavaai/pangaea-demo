'use client'

import type { RichBlock } from '@/lib/assistant/types'
import { OperativeTable } from './renders/operative-table'
import { StatsGrid } from './renders/stats-grid'
import { DataTable } from './renders/data-table'
import { WorkflowStatus } from './renders/workflow-status'
import { MissingFieldsCard } from './renders/missing-fields-card'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeepLink({ data }: { data: any }) {
  return (
    <Link
      href={data.href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest-600/20 border border-forest-600/40 text-forest-400 rounded-md text-xs font-medium hover:bg-forest-600/30 transition-colors my-1"
    >
      <ExternalLink className="h-3 w-3" />
      {data.label}
    </Link>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NcrList({ data }: { data: any[] }) {
  const severityColors: Record<string, string> = {
    minor: 'bg-blue-500/20 text-blue-400',
    major: 'bg-amber-500/20 text-amber-400',
    critical: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="my-2 space-y-2">
      {data.map((ncr, i) => (
        <Link
          key={i}
          href={`/ncrs/${ncr.id}`}
          className="block bg-card/60 rounded-lg p-3 border border-border/50 hover:border-border hover:bg-card/80 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${severityColors[ncr.severity] ?? 'bg-[#444444] text-muted-foreground'}`}>
              {ncr.severity}
            </span>
            <span className="text-xs text-muted-foreground">{ncr.resolved ? 'resolved' : 'open'}</span>
          </div>
          <p className="text-xs text-muted-foreground">{ncr.description}</p>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(ncr.operatives as any)?.first_name && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(ncr.operatives as any).first_name} {(ncr.operatives as any).last_name}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(ncr.sites as any)?.name && ` — ${(ncr.sites as any).name}`}
            </p>
          )}
        </Link>
      ))}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SiteTable({ data }: { data: any[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground my-2">No sites found.</p>
  return (
    <div className="my-2 overflow-x-auto rounded border border-border/50">
      <table className="min-w-max w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-card/50">
            <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Name</th>
            <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Address</th>
            <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((site, i) => (
            <tr key={site.id ?? i} className="border-b border-border/50 hover:bg-card/30 transition-colors">
              <td className="py-1.5 px-2">
                <Link href={`/sites/${site.id}`} className="text-forest-400 hover:text-forest-300 font-medium whitespace-nowrap">
                  {site.name}
                </Link>
              </td>
              <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">{site.address ?? '—'}</td>
              <td className="py-1.5 px-2 whitespace-nowrap">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${site.is_active ? 'bg-green-500/20 text-green-400' : 'bg-muted/20 text-muted-foreground'}`}>
                  {site.is_active ? 'active' : 'inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RichRenderer({ block, onAction }: { block: RichBlock; onAction?: (msg: string) => void }) {
  switch (block.type) {
    case 'operative_table':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <OperativeTable data={block.data as any[]} />
    case 'stats_grid':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <StatsGrid data={block.data as any[]} />
    case 'site_table':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <SiteTable data={block.data as any[]} />
    case 'data_table':
    case 'allocation_table':
    case 'timesheet_table':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <DataTable data={block.data as any} />
    case 'ncr_list':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <NcrList data={block.data as any[]} />
    case 'deep_link':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <DeepLink data={block.data as any} />
    case 'workflow_status':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <WorkflowStatus data={block.data as any} />
    case 'missing_fields':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <MissingFieldsCard data={block.data as any} onAction={onAction} />
    default:
      return null
  }
}
