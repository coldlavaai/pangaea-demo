export default function DocumentsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="h-10 bg-slate-800/50 border-b border-slate-800" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={`d-${i}`} className="h-14 border-b border-slate-800/50 px-4 flex items-center gap-4">
            <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
            <div className="h-5 w-16 bg-slate-800 rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
