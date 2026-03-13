export default function RequestsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-44 bg-slate-800 rounded animate-pulse" />
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="h-10 bg-slate-800/50 border-b border-slate-800" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`r-${i}`} className="h-14 border-b border-slate-800/50 px-4 flex items-center gap-4">
            <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
            <div className="h-5 w-16 bg-slate-800 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
