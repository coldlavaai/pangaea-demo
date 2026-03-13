export default function OperativesLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-card rounded animate-pulse" />
        <div className="h-9 w-32 bg-card rounded animate-pulse" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-9 w-64 bg-card rounded animate-pulse" />
        <div className="h-9 w-28 bg-card rounded animate-pulse" />
        <div className="h-9 w-28 bg-card rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <div className="h-10 bg-card/50 border-b border-border" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={`row-${i}`} className="h-14 border-b border-border/50 flex items-center px-4 gap-4">
            <div className="h-4 w-32 bg-card rounded animate-pulse" />
            <div className="h-4 w-24 bg-card rounded animate-pulse" />
            <div className="h-4 w-20 bg-card rounded animate-pulse" />
            <div className="h-5 w-16 bg-card rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
