import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { AdvertForm } from '@/components/adverts/advert-form'

export default async function NewAdvertPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const supabase = await createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [{ data: requests }, { data: templates }] = await Promise.all([
    supabase
      .from('labour_requests')
      .select('id, start_date, headcount_required, site:sites!labour_requests_site_id_fkey(name), trade_category:trade_categories!labour_requests_trade_category_id_fkey(name)')
      .eq('organization_id', orgId)
      .in('status', ['pending', 'searching', 'partial'])
      .order('created_at', { ascending: false }),
    supabase
      .from('advert_templates')
      .select('id, name, platform, headline, body_copy, call_to_action')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name'),
  ])

  const isTemplate = mode === 'template'

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <PageHeader
        title={isTemplate ? 'New Template' : 'New Advert'}
        description={isTemplate ? 'Create a reusable advert template' : 'Create and track a job advert'}
      />
      <AdvertForm
        mode={isTemplate ? 'template' : 'advert'}
        requests={(requests ?? []) as { id: string; start_date: string; headcount_required: number; site: { name: string } | null; trade_category: { name: string } | null }[]}
        templates={(templates ?? []) as { id: string; name: string; platform: string; headline: string; body_copy: string; call_to_action: string | null }[]}
      />
    </div>
  )
}
