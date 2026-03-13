export default function CommsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-40 bg-slate-800 rounded animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`t-${i}`} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-slate-800 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-48 bg-slate-800 rounded animate-pulse" />
            </div>
            <div className="h-3 w-16 bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
