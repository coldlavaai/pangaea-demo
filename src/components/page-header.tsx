import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between py-2 border-b border-slate-800/60', className)}>
      <div className="flex items-baseline gap-3 min-w-0">
        <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-none">{title}</h1>
        {description && (
          <span className="text-xs text-slate-500 truncate">{description}</span>
        )}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  )
}
