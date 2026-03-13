import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const supabase = await createClient()
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
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
          { label: 'Active', value: stats.active, icon: Megaphone, colour: 'text-emerald-400' },
          { label: 'Impressions', value: stats.impressions.toLocaleString(), icon: Eye, colour: 'text-slate-300' },
          { label: 'Clicks', value: stats.clicks.toLocaleString(), icon: MousePointer, colour: 'text-slate-300' },
          { label: 'Applications', value: stats.applications.toLocaleString(), icon: Users, colour: 'text-slate-300' },
        ].map(({ label, value, icon: Icon, colour }) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${colour}`} />
              <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
            </div>
            <p className={`text-2xl font-semibold tabular-nums ${colour}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Adverts table */}
        <div className="xl:col-span-2 space-y-2">
          <h2 className="text-sm font-medium text-slate-300">All Adverts</h2>

          {advertList.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No adverts yet"
              description="Create your first advert to start tracking recruitment."
              action={
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link href="/adverts/new"><Plus className="h-4 w-4 mr-1" />New Advert</Link>
                </Button>
              }
            />
          ) : (
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Platform</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Impr.</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Clicks</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Apps</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {[...advertList].sort((a, b) =>
                    STATUS_ORDER.indexOf(a.status ?? 'draft') - STATUS_ORDER.indexOf(b.status ?? 'draft')
                  ).map((ad) => (
                    <tr key={ad.id} className="hover:bg-slate-900/50">
                      <td className="px-4 py-3">
                        <Link href={`/adverts/${ad.id}`} className="text-emerald-400 hover:underline font-medium">
                          {PLATFORM_LABELS[ad.platform] ?? ad.platform}
                        </Link>
                        {ad.external_url && (
                          <a
                            href={ad.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-xs text-slate-500 hover:text-slate-300"
                          >
                            ↗
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ad.status ?? 'draft'} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                        {(ad.impressions ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-400">
                        {(ad.clicks ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-300 font-medium">
                        {(ad.applications ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-400">
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
            <h2 className="text-sm font-medium text-slate-300">Templates</h2>
            <Link href="/adverts/new?mode=template" className="text-xs text-emerald-400 hover:underline">
              + New template
            </Link>
          </div>

          {templateList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-600">
              No templates yet
            </div>
          ) : (
            <div className="space-y-1.5">
              {templateList.map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2.5 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-200">{t.name}</p>
                    <p className="text-xs text-slate-500">{PLATFORM_LABELS[t.platform] ?? t.platform}</p>
                  </div>
                  {!t.is_active && (
                    <span className="text-xs text-slate-600">Inactive</span>
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
