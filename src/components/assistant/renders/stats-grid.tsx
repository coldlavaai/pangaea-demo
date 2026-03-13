'use client'

interface StatItem {
  label: string
  value: number | string
  color?: string
}

const colorMap: Record<string, string> = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  emerald: 'text-emerald-400',
  teal: 'text-teal-400',
  red: 'text-red-400',
  amber: 'text-amber-400',
  orange: 'text-orange-400',
  purple: 'text-purple-400',
}

export function StatsGrid({ data }: { data: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-2">
      {data.map((stat, i) => (
        <div key={i} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <div className={`text-2xl font-bold ${colorMap[stat.color ?? 'blue'] ?? 'text-blue-400'}`}>
            {stat.value}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
