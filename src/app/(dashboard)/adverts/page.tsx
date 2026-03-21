import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'
import Link from 'next/link'
import { Plus, Megaphone, Eye, MousePointer, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState } from '@/components/empty-state'

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  other: 'Other',
}

const STATUS_ORDER = ['active', 'draft', 'paused', 'ended']

export default async function AdvertsPage() {
  const role = await getUserRole()
  if (role === 'site_manager' || role === 'auditor') redirect('/unauthorized')

  const supabase = createServiceClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [{ data: adverts }, { data: templates }] = await Promise.all([
    supabase
      .from('adverts')
      .select('*, labour_request:labour_requests(id)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),

    supabase
      .from('advert_templates')
      .select('id, name, platform, is_active')
      .eq('organization_id', orgId)
      .order('name'),
  ])

  const advertList = adverts ?? []
  const templateList = templates ?? []

  const stats = {
    active: advertList.filter((a) => a.status === 'active').length,
    impressions: advertList.reduce((s, a) => s + (a.impressions ?? 0), 0),
    clicks: advertList.reduce((s, a) => s + (a.clicks ?? 0), 0),
    applications: advertList.reduce((s, a) => s + (a.applications ?? 0), 0),
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Adverts"
        description="Job adverts across all platforms"
        action={
          <Button asChild size="sm" className="bg-forest-600 hover:bg-forest-700 text-white">
            <Link href="/adverts/new">
              <Plus className="h-4 w-4 mr-1" />
              New Advert
            </Link>
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active', value: stats.active, icon: Megaphone, colour: 'text-forest-400' },
          { label: 'Impressions', value: stats.impressions.toLocaleString(), icon: Eye, colour: 'text-muted-foreground' },
          { label: 'Clicks', value: stats.clicks.toLocaleString(), icon: MousePointer, colour: 'text-muted-foreground' },
          { label: 'Applications', value: stats.applications.toLocaleString(), icon: Users, colour: 'text-muted-foreground' },
        ].map(({ label, value, icon: Icon, colour }) => (
          <div key={label} className="rounded-lg border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${colour}`} />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <p className={`text-2xl font-semibold tabular-nums ${colour}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Adverts table */}
        <div className="xl:col-span-2 space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">All Adverts</h2>

          {advertList.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No adverts yet"
              description="Create your first advert to start tracking recruitment."
              action={
                <Button asChild size="sm" className="bg-forest-600 hover:bg-forest-700 text-white">
                  <Link href="/adverts/new"><Plus className="h-4 w-4 mr-1" />New Advert</Link>
                </Button>
              }
            />
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/80">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Platform</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Impr.</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Clicks</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Apps</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...advertList].sort((a, b) =>
                    STATUS_ORDER.indexOf(a.status ?? 'draft') - STATUS_ORDER.indexOf(b.status ?? 'draft')
                  ).map((ad) => (
                    <tr key={ad.id} className="hover:bg-background/50">
                      <td className="px-4 py-3">
                        <Link href={`/adverts/${ad.id}`} className="text-forest-400 hover:underline font-medium">
                          {PLATFORM_LABELS[ad.platform] ?? ad.platform}
                        </Link>
                        {ad.external_url && (
                          <a
                            href={ad.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-xs text-muted-foreground hover:text-muted-foreground"
                          >
                            ↗
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ad.status ?? 'draft'} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {(ad.impressions ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {(ad.clicks ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground font-medium">
                        {(ad.applications ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {ad.budget != null ? `£${Number(ad.budget).toFixed(0)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Templates sidebar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Templates</h2>
            <Link href="/adverts/new?mode=template" className="text-xs text-forest-400 hover:underline">
              + New template
            </Link>
          </div>

          {templateList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No templates yet
            </div>
          ) : (
            <div className="space-y-1.5">
              {templateList.map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-border bg-background/40 px-3 py-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{PLATFORM_LABELS[t.platform] ?? t.platform}</p>
                  </div>
                  {!t.is_active && (
                    <span className="text-xs text-muted-foreground">Inactive</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
