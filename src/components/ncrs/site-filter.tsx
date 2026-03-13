'use client'

interface SiteFilterProps {
  sites: { id: string; name: string }[]
  currentSiteId: string
  currentParams: { type?: string; resolved?: string; operative_id?: string }
}

export function SiteFilter({ sites, currentSiteId, currentParams }: SiteFilterProps) {
  function buildHref(siteId: string) {
    const next: Record<string, string> = { ...currentParams, page: '1' }
    if (siteId) next.site_id = siteId
    else delete next.site_id
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)))
    return `/ncrs${qs.toString() ? `?${qs}` : ''}`
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Site:</span>
      <select
        value={currentSiteId}
        onChange={(e) => { window.location.href = buildHref(e.target.value) }}
        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
      >
        <option value="">All sites</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}
