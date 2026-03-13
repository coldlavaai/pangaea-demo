import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  secondary?: string
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatsCard({ title, value, secondary, icon: Icon, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/60 to-slate-900/80 px-4 py-3 overflow-hidden',
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-600/40 to-transparent" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide leading-none">{title}</p>
          <p className="mt-1 text-xl font-bold text-slate-100 leading-none tabular-nums">{value}</p>
          {secondary && (
            <p className="mt-0.5 text-[10px] text-slate-500">{secondary}</p>
          )}
        </div>
        {Icon && (
          <div className="rounded-md bg-slate-800 border border-slate-700/50 p-1.5 shrink-0">
            <Icon className="h-3.5 w-3.5 text-slate-400" />
          </div>
        )}
      </div>
    </div>
  )
}
