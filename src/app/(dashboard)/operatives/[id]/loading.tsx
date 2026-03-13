export default function OperativeDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 bg-slate-800 rounded animate-pulse" />
        <div className="h-8 w-56 bg-slate-800 rounded animate-pulse" />
      </div>

      {/* Status strip */}
      <div className="flex gap-3">
        <div className="h-6 w-20 bg-slate-800 rounded-full animate-pulse" />
        <div className="h-6 w-24 bg-slate-800 rounded-full animate-pulse" />
        <div className="h-6 w-16 bg-slate-800 rounded-full animate-pulse" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800 pb-px">
        {['Overview', 'Documents', 'Allocations', 'RAP', 'NCRs', 'Comms'].map(t => (
          <div key={t} className="h-9 w-24 bg-slate-800/50 rounded-t animate-pulse" />
        ))}
      </div>

      {/* Tab content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-48 animate-pulse" />
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-48 animate-pulse" />
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-48 animate-pulse" />
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-48 animate-pulse" />
      </div>
    </div>
  )
}
