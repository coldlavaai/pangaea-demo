export default function SitesLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-24 bg-card rounded animate-pulse" />
      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <div className="h-10 bg-card/50 border-b border-border" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`r-${i}`} className="h-14 border-b border-border/50 px-4 flex items-center gap-4">
            <div className="h-4 w-36 bg-card rounded animate-pulse" />
            <div className="h-4 w-24 bg-card rounded animate-pulse" />
            <div className="h-5 w-16 bg-card rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
