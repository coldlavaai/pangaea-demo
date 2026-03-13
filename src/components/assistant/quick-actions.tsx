'use client'

const QUICK_ACTIONS = [
  'How many operatives are working today?',
  'Show me operatives with expired CSCS cards',
  'What sites are active right now?',
  'Show me pending timesheets',
  'Any open NCRs this week?',
  'Show me available groundworkers',
]

export function QuickActions({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-2">✦</div>
        <h2 className="text-sm font-semibold text-slate-200">ALF — Aztec Construction AI</h2>
        <p className="text-xs text-slate-500 mt-1">Ask me anything about your workforce</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            onClick={() => onSelect(action)}
            className="text-left px-3 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-600 rounded-lg text-xs text-slate-300 transition-colors"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}
