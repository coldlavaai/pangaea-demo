import { cn } from '@/lib/utils'

const statusColours: Record<string, string> = {
  // Operative
  prospect:     'bg-slate-800 text-slate-300',
  qualifying:   'bg-blue-900 text-blue-300',
  pending_docs: 'bg-amber-900 text-amber-300',
  verified:     'bg-teal-900 text-teal-300',
  available:    'bg-emerald-900 text-emerald-300',
  working:      'bg-blue-900 text-blue-200',
  unavailable:  'bg-slate-800 text-slate-400',
  blocked:      'bg-red-900 text-red-300',
  // Request
  pending:      'bg-amber-900 text-amber-300',
  searching:    'bg-blue-900 text-blue-300',
  partial:      'bg-orange-900 text-orange-300',
  fulfilled:    'bg-emerald-900 text-emerald-300',
  cancelled:    'bg-slate-800 text-slate-400',
  // Allocation
  offered:      'bg-blue-900 text-blue-300',
  confirmed:    'bg-teal-900 text-teal-300',
  active:       'bg-emerald-900 text-emerald-300',
  completed:    'bg-slate-800 text-slate-400',
  no_show:      'bg-red-900 text-red-300',
  // Document
  rejected:     'bg-red-900 text-red-300',
  expired:      'bg-red-900 text-red-300',
  // Attendance
  expected:     'bg-slate-800 text-slate-300',
  arrived:      'bg-emerald-900 text-emerald-300',
  // RAP
  green:        'bg-emerald-900 text-emerald-300',
  amber:        'bg-amber-900 text-amber-300',
  red:          'bg-red-900 text-red-300',
}

const displayLabels: Record<string, string> = {
  prospect: 'Prospect',
  qualifying: 'Qualifying',
  pending_docs: 'Docs Pending',
  verified: 'Verified',
  available: 'Available',
  working: 'Working',
  unavailable: 'Unavailable',
  blocked: 'Blocked',
  pending: 'Pending',
  searching: 'Searching',
  partial: 'Partial',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  offered: 'Offered',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Completed',
  no_show: 'No Show',
  rejected: 'Rejected',
  expired: 'Expired',
  expected: 'Expected',
  arrived: 'Arrived',
  green: 'Green',
  amber: 'Amber',
  red: 'Red',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colour = statusColours[status] ?? 'bg-slate-800 text-slate-300'
  const label = displayLabels[status] ?? status.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        colour,
        className
      )}
    >
      {label}
    </span>
  )
}
