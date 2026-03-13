'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OperativeTable({ data }: { data: any[] }) {
  if (!data.length) return <p className="text-sm text-slate-400 my-2">No operatives found.</p>

  const statusColors: Record<string, string> = {
    working: 'bg-green-500/20 text-green-400',
    available: 'bg-emerald-500/20 text-emerald-400',
    verified: 'bg-teal-500/20 text-teal-400',
    blocked: 'bg-red-500/20 text-red-400',
    unavailable: 'bg-slate-500/20 text-slate-400',
    prospect: 'bg-blue-500/20 text-blue-400',
    pending_docs: 'bg-amber-500/20 text-amber-400',
    qualifying: 'bg-purple-500/20 text-purple-400',
  }

  const cscsColors: Record<string, string> = {
    gold: 'bg-yellow-500/20 text-yellow-400',
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    black: 'bg-slate-300/20 text-slate-300',
    red: 'bg-red-500/20 text-red-400',
    white: 'bg-white/20 text-white',
  }

  const sourceColors: Record<string, string> = {
    manual: 'bg-slate-500/20 text-slate-400',
    import: 'bg-blue-500/20 text-blue-400',
    sophie: 'bg-emerald-500/20 text-emerald-400',
    referral: 'bg-purple-500/20 text-purple-400',
    other: 'bg-slate-500/20 text-slate-400',
  }

  return (
    <div className="my-2 overflow-x-auto rounded border border-slate-700/50">
      <table className="min-w-max w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/50">
            <th className="text-left py-1.5 px-2 text-slate-400 font-medium whitespace-nowrap">Name</th>
            <th className="text-left py-1.5 px-2 text-slate-400 font-medium whitespace-nowrap">Status</th>
            <th className="text-left py-1.5 px-2 text-slate-400 font-medium whitespace-nowrap">Trade</th>
            <th className="text-left py-1.5 px-2 text-slate-400 font-medium whitespace-nowrap">CSCS Card</th>
            <th className="text-left py-1.5 px-2 text-slate-400 font-medium whitespace-nowrap">CSCS Expiry</th>
            <th className="text-left py-1.5 px-2 text-slate-400 font-medium whitespace-nowrap">Phone</th>
            <th className="text-left py-1.5 px-2 text-slate-400 font-medium whitespace-nowrap">Email</th>
            <th className="text-left py-1.5 px-2 text-slate-400 font-medium whitespace-nowrap">Source</th>
          </tr>
        </thead>
        <tbody>
          {data.map(op => (
            <tr key={op.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
              <td className="py-1.5 px-2 whitespace-nowrap">
                <Link href={`/operatives/${op.id}`} className="text-emerald-400 hover:text-emerald-300 font-medium">
                  {op.first_name} {op.last_name}
                </Link>
              </td>
              <td className="py-1.5 px-2 whitespace-nowrap">
                {op.status ? (
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', statusColors[op.status] ?? 'bg-slate-700 text-slate-300')}>
                    {op.status.replace(/_/g, ' ')}
                  </span>
                ) : '-'}
              </td>
              <td className="py-1.5 px-2 text-slate-300 whitespace-nowrap">{op.trade_categories?.name ?? '-'}</td>
              <td className="py-1.5 px-2 whitespace-nowrap">
                {op.cscs_card_type ? (
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', cscsColors[op.cscs_card_type] ?? 'bg-slate-700 text-slate-300')}>
                    {op.cscs_card_type}
                  </span>
                ) : '-'}
              </td>
              <td className="py-1.5 px-2 text-slate-400 whitespace-nowrap">{op.cscs_expiry ?? '-'}</td>
              <td className="py-1.5 px-2 text-slate-400 whitespace-nowrap">{op.phone ?? '-'}</td>
              <td className="py-1.5 px-2 text-slate-400 whitespace-nowrap">{op.email ?? '-'}</td>
              <td className="py-1.5 px-2 whitespace-nowrap">
                {op.entry_source ? (
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', sourceColors[op.entry_source] ?? 'bg-slate-700 text-slate-300')}>
                    {op.entry_source}
                  </span>
                ) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
