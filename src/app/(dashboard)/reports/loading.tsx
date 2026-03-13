export default function ReportsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-36 bg-card rounded animate-pulse" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`t-${i}`} className="h-9 w-24 bg-card rounded animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`s-${i}`} className="bg-background border border-border rounded-lg p-4 space-y-2">
            <div className="h-3 w-20 bg-card rounded animate-pulse" />
            <div className="h-7 w-12 bg-card rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-background border border-border rounded-lg p-4 h-80 animate-pulse" />
    </div>
  )
}
