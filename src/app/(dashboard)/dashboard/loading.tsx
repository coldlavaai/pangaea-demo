export default function DashboardPageLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={`stat-${i}`} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="h-3 w-20 bg-slate-800 rounded animate-pulse" />
            <div className="h-7 w-12 bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-64 animate-pulse" />
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-64 animate-pulse" />
      </div>
    </div>
  )
}
