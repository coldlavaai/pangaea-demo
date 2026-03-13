import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

const TRADE_SLANG: Record<string, string> = {
  brickies: 'bricklayer', brickie: 'bricklayer',
  chippies: 'carpenter', chippie: 'carpenter', chippy: 'carpenter',
  sparks: 'electrician', sparky: 'electrician', spark: 'electrician',
  groundies: 'groundworker', groundie: 'groundworker',
  spreads: 'plasterer', scaffies: 'scaffolder',
  steelies: 'steel fixer', labourers: 'labourer', labour: 'labourer',
}

function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function cscsStatus(expiry: string | null): string {
  if (!expiry) return 'none'
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= 30) return `expires in ${days}d`
  if (days <= 90) return `expires in ${Math.round(days / 30)}mo`
  return `valid (${expiry})`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeRecommendOperatives(input: any): Promise<ToolResult> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (!input.trade) return { text_result: 'trade is required for recommendations' }

  // Normalise trade slang
  const tradeName = TRADE_SLANG[input.trade.toLowerCase().trim()] ?? input.trade

  // Resolve trade category
  const { data: tc } = await supabase
    .from('trade_categories')
    .select('id, name')
    .eq('organization_id', ORG_ID)
    .ilike('name', `%${tradeName}%`)
    .limit(1)
    .single()

  if (!tc) return { text_result: `Trade "${input.trade}" not found in trade categories.` }

  // Resolve site if given
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let site: any = null
  if (input.site_id) {
    const { data } = await supabase.from('sites').select('id, name, address, postcode, lat, lng').eq('id', input.site_id).single()
    site = data
  } else if (input.site_name) {
    const { data } = await supabase.from('sites').select('id, name, address, postcode, lat, lng')
      .eq('organization_id', ORG_ID).ilike('name', `%${input.site_name}%`).limit(1).single()
    site = data
  }

  // Fetch candidates — full profile for rich AI reasoning
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('operatives')
    .select(`
      id, first_name, last_name, phone, email, status,
      cscs_card_type, cscs_expiry, cscs_card_title,
      day_rate, hourly_rate, experience_years, grade,
      nationality, languages, preferred_language,
      notes, other_certifications, caution_reason, reemploy_status,
      avg_rap_score, total_jobs, total_reviews, rap_traffic_light,
      lat, lng, postcode, city, county,
      machine_operator, data_completeness_score,
      trade_categories(name)
    `)
    .eq('organization_id', ORG_ID)
    .eq('trade_category_id', tc.id)
    .in('status', ['available', 'verified', 'working'])
    .limit(40)

  if (input.min_rap) query = query.gte('avg_rap_score', input.min_rap)
  if (input.cscs_required) {
    const today = new Date().toISOString().split('T')[0]
    query = query.gt('cscs_expiry', today)
  }
  if (input.language) query = query.contains('languages', [input.language])
  if (input.nationality) query = query.ilike('nationality', `%${input.nationality}%`)
  if (input.machine_operator) query = query.eq('machine_operator', true)

  const { data: candidates, error } = await query
  if (error) return { text_result: `Error fetching candidates: ${error.message}` }
  if (!candidates?.length) return { text_result: `No available ${tc.name}s found matching the criteria.` }

  // Fetch last worked dates from view
  const candidateIds = candidates.map((c: { id: string }) => c.id)
  const { data: lastWorked } = await db
    .from('operative_last_worked')
    .select('operative_id, last_worked_date, completed_allocations')
    .in('operative_id', candidateIds)
    .eq('organization_id', ORG_ID)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastWorkedMap = new Map((lastWorked ?? []).map((lw: any) => [lw.operative_id, lw]))

  // Fetch recent NCR counts
  const { data: ncrData } = await supabase
    .from('non_conformance_incidents')
    .select('operative_id')
    .in('operative_id', candidateIds)
    .eq('organization_id', ORG_ID)
    .eq('resolved', false)

  const ncrCount: Record<string, number> = {}
  for (const ncr of ncrData ?? []) {
    if (ncr.operative_id) ncrCount[ncr.operative_id] = (ncrCount[ncr.operative_id] ?? 0) + 1
  }

  // Enrich candidates with computed fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = candidates.map((op: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lw = lastWorkedMap.get(op.id) as any
    const daysSinceWorked = lw?.last_worked_date
      ? Math.floor((Date.now() - new Date(lw.last_worked_date).getTime()) / 86400000)
      : null
    const distance = (site?.lat && site?.lng && op.lat && op.lng)
      ? Math.round(distanceMiles(op.lat, op.lng, site.lat, site.lng))
      : null

    return {
      id: op.id,
      name: `${op.first_name} ${op.last_name}`,
      first_name: op.first_name,
      phone: op.phone,
      email: op.email,
      status: op.status,
      trade: tc.name,
      grade: op.grade,
      cscs_card_type: op.cscs_card_type,
      cscs_status: cscsStatus(op.cscs_expiry),
      cscs_card_title: op.cscs_card_title,
      day_rate: op.day_rate,
      experience_years: op.experience_years,
      nationality: op.nationality,
      languages: op.languages,
      notes: op.notes,
      other_certifications: op.other_certifications,
      caution_reason: op.caution_reason,
      reemploy_status: op.reemploy_status,
      machine_operator: op.machine_operator,
      avg_rap_score: op.avg_rap_score,
      rap_traffic_light: op.rap_traffic_light,
      total_jobs: op.total_jobs ?? lw?.completed_allocations ?? 0,
      open_ncrs: ncrCount[op.id] ?? 0,
      last_worked_date: lw?.last_worked_date ?? null,
      days_since_worked: daysSinceWorked,
      distance_miles: distance,
      data_completeness: op.data_completeness_score,
    }
  })

  const quantity = input.quantity ?? 3

  // Build a concise text summary for Claude to reason about
  const summaryLines = enriched.map((op: typeof enriched[0], i: number) => {
    const parts = [
      `${i + 1}. ${op.name}`,
      `RAP: ${op.avg_rap_score ?? 'unrated'}`,
      `jobs: ${op.total_jobs}`,
      op.days_since_worked !== null ? `last worked: ${op.days_since_worked}d ago` : 'never worked with us',
      `CSCS: ${op.cscs_status}`,
      op.distance_miles !== null ? `${op.distance_miles}mi from site` : null,
      op.open_ncrs > 0 ? `⚠ ${op.open_ncrs} open NCR` : null,
      op.caution_reason ? `⚠ caution: ${op.caution_reason}` : null,
      op.notes ? `notes: "${op.notes.substring(0, 80)}"` : null,
      op.other_certifications ? `certs: ${op.other_certifications}` : null,
      op.languages?.length ? `languages: ${op.languages.join(', ')}` : null,
    ].filter(Boolean)
    return parts.join(' | ')
  })

  const text_result = [
    `Found ${enriched.length} available ${tc.name}s.`,
    site ? `Site: ${site.name}${site.address ? ` (${site.address})` : ''}` : null,
    `Job context: ${input.job_description ?? 'not specified'}`,
    `Recommend the best ${quantity} considering ALL factors (RAP, recency, CSCS, distance, notes, certifications, NCRs, cautions, languages).`,
    '',
    ...summaryLines,
  ].filter(s => s !== null).join('\n')

  return {
    text_result,
    rich_result: {
      type: 'data_table',
      data: {
        columns: ['Name', 'RAP', 'Last Worked', 'CSCS', 'Distance', 'Jobs', 'NCRs', 'Phone', 'Notes'],
        rows: enriched.map((op: typeof enriched[0]) => [
          op.name,
          op.avg_rap_score ? `${op.avg_rap_score}/5` : '—',
          op.days_since_worked !== null ? `${op.days_since_worked}d ago` : 'Never',
          op.cscs_status,
          op.distance_miles !== null ? `${op.distance_miles}mi` : '—',
          String(op.total_jobs ?? 0),
          op.open_ncrs > 0 ? `⚠ ${op.open_ncrs}` : '0',
          op.phone ?? '—',
          op.notes ? op.notes.substring(0, 50) : '—',
        ]),
      },
    },
  }
}
