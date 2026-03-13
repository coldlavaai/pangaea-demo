import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeOperativeRead(input: any): Promise<ToolResult> {
  const supabase = await createClient()

  switch (input.action) {
    case 'search': {
      // Look up trade category ID if a trade name is specified
      let tradeCategoryId: string | null = null
      if (input.trade) {
        // Normalise common UK trade slang before querying
        const TRADE_SLANG: Record<string, string> = {
          brickies: 'bricklayer', brickie: 'bricklayer',
          chippies: 'carpenter', chippie: 'carpenter', chippy: 'carpenter',
          sparks: 'electrician', sparky: 'electrician', spark: 'electrician',
          groundies: 'groundworker', groundie: 'groundworker',
          spreads: 'plasterer',
          scaffies: 'scaffolder',
          steelies: 'steel fixer',
          plumbers: 'plumber',
          roofers: 'roofer',
          tilers: 'tiler',
          labourers: 'labourer', labour: 'labourer',
        }
        const normalised = TRADE_SLANG[input.trade.toLowerCase().trim()] ?? input.trade

        const { data: tc } = await supabase
          .from('trade_categories')
          .select('id')
          .eq('organization_id', ORG_ID)
          .ilike('name', `%${normalised}%`)
          .limit(1)
          .single()
        tradeCategoryId = tc?.id ?? null
      }

      let query = supabase
        .from('operatives')
        .select('id, reference_number, first_name, last_name, email, phone, status, cscs_card_type, cscs_expiry, entry_source, trade_categories(name)')
        .eq('organization_id', ORG_ID)
        .order('first_name')
        .limit(input.limit ?? 20)

      if (input.status) query = query.eq('status', input.status)
      if (input.cscs_type) query = query.eq('cscs_card_type', input.cscs_type)
      if (input.has_phone) query = query.not('phone', 'is', null)
      if (tradeCategoryId) query = query.eq('trade_category_id', tradeCategoryId)
      if (input.query) {
        const parts = String(input.query).trim().split(/\s+/)
        if (parts.length >= 2) {
          // Full name search: first word matches first_name, remaining match last_name
          const first = parts[0]
          const last = parts.slice(1).join(' ')
          query = query.ilike('first_name', `%${first}%`).ilike('last_name', `%${last}%`)
        } else {
          query = query.or(`first_name.ilike.%${input.query}%,last_name.ilike.%${input.query}%,phone.ilike.%${input.query}%`)
        }
      }
      if (input.expiring_cscs_days) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() + input.expiring_cscs_days)
        query = query.lte('cscs_expiry', cutoff.toISOString().split('T')[0]).not('cscs_expiry', 'is', null)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (input.min_completeness_score != null) query = (query as any).gte('data_completeness_score', input.min_completeness_score)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (input.max_completeness_score != null) query = (query as any).lte('data_completeness_score', input.max_completeness_score)
      if (input.has_email === true) query = query.not('email', 'is', null)
      if (input.has_email === false || input.missing_email === true) query = query.is('email', null)
      if (input.missing_phone === true) query = query.is('phone', null)
      if (input.nationality) query = query.ilike('nationality', `%${input.nationality}%`)
      if (input.language) query = query.contains('languages', [input.language])

      const { data, error } = await query
      if (error) return { text_result: `Error searching operatives: ${error.message}` }

      const count = data?.length ?? 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data ?? []).map((op: any) =>
        `- ${op.first_name} ${op.last_name} | ID: ${op.id} | Ref: ${op.reference_number ?? 'N/A'} | status: ${op.status} | phone: ${op.phone ?? 'missing'} | email: ${op.email ?? 'missing'} | CSCS: ${op.cscs_card_type ?? 'none'} expires ${op.cscs_expiry ?? 'N/A'} | trade: ${(op.trade_categories as { name: string } | null)?.name ?? 'none'}`
      ).join('\n')
      // Only show the rich table for filtered list queries (trade/status browsing).
      // For name searches, suppress the table — ALF handles disambiguation in text.
      const isNameSearch = !!input.query
      return {
        text_result: `Found ${count} operative${count !== 1 ? 's' : ''}:\n${rows}`,
        rich_result: isNameSearch ? null : {
          type: 'operative_table',
          data: data ?? [],
        },
      }
    }

    case 'get_profile': {
      if (!input.operative_id) return { text_result: 'operative_id required for get_profile' }
      const { data, error } = await supabase
        .from('operatives')
        .select('*, trade_categories(name)')
        .eq('id', input.operative_id)
        .eq('organization_id', ORG_ID)
        .single()

      if (error || !data) return { text_result: `Operative not found: ${error?.message}` }

      // Fetch documents to check for pending (uploaded but not yet verified)
      const { data: docRows } = await supabase
        .from('documents')
        .select('document_type, status')
        .eq('operative_id', input.operative_id)
        .eq('organization_id', ORG_ID)
      const pendingDocTypes = new Set(
        (docRows ?? []).filter(d => d.status === 'pending').map(d => d.document_type)
      )

      // Serialize the full row so ALF can read every field directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any
      const profile = {
        id: d.id,
        ref: d.reference_number,
        name: `${d.first_name} ${d.last_name}`,
        status: d.status,
        trade: (d.trade_categories as { name: string } | null)?.name ?? null,
        phone: d.phone,
        email: d.email,
        ni_number: d.ni_number,
        date_of_birth: d.date_of_birth,
        address_line1: d.address_line1,
        city: d.city,
        postcode: d.postcode,
        bank_sort_code: d.bank_sort_code,
        bank_account_number: d.bank_account_number,
        utr_number: d.utr_number,
        nok_name: d.next_of_kin_name,
        nok_phone: d.next_of_kin_phone,
        cscs_card_type: d.cscs_card_type,
        cscs_expiry: d.cscs_expiry,
        cscs_card_title: d.cscs_card_title,
        day_rate: d.day_rate,
        grade: d.grade,
        nationality: d.nationality,
        avg_rap_score: d.avg_rap_score,
        total_jobs: d.total_jobs,
        data_completeness_score: d.data_completeness_score,
        has_verified_photo_id: d.has_verified_photo_id,
        has_verified_rtw: d.has_verified_rtw,
        notes: d.notes,
        caution_reason: d.caution_reason,
        reemploy_status: d.reemploy_status,
      }

      const REQUIRED_FIELDS: Array<[string, string]> = [
        ['ni_number', 'NI Number'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['bank_sort_code', 'Bank Sort Code'],
        ['bank_account_number', 'Bank Account'],
      ]
      const OPTIONAL_FIELDS: Array<[string, string]> = [
        ['date_of_birth', 'Date of Birth'],
        ['address_line1', 'Address'],
        ['utr_number', 'UTR'],
        ['next_of_kin_name', 'Next of Kin Name'],
        ['next_of_kin_phone', 'Next of Kin Phone'],
      ]

      const missingRequired = REQUIRED_FIELDS.filter(([f]) => !d[f]).map(([key, label]) => ({ key, label }))
      const missingOptional = OPTIONAL_FIELDS.filter(([f]) => !d[f]).map(([key, label]) => ({ key, label }))
      const missingDocs: Array<{ key: string; label: string }> = []
      const pendingDocs: Array<{ key: string; label: string }> = []
      if (!d.has_verified_photo_id) {
        if (pendingDocTypes.has('photo_id')) {
          pendingDocs.push({ key: 'photo_id', label: 'Photo ID / Passport (uploaded — needs verifying)' })
        } else {
          missingDocs.push({ key: 'photo_id', label: 'Photo ID / Passport' })
        }
      }
      if (!d.has_verified_rtw) {
        if (pendingDocTypes.has('right_to_work')) {
          pendingDocs.push({ key: 'right_to_work', label: 'Right to Work (uploaded — needs verifying)' })
        } else {
          missingDocs.push({ key: 'right_to_work', label: 'Right to Work' })
        }
      }
      if (d.cscs_card_type && !d.cscs_expiry) missingDocs.push({ key: 'cscs_card', label: 'CSCS card (expiry missing)' })

      const presentLabels: string[] = []
      if (d.phone) presentLabels.push('Phone')
      if (d.email) presentLabels.push('Email')
      if (d.address_line1) presentLabels.push('Address')
      if (d.date_of_birth) presentLabels.push('DOB')
      if (d.ni_number) presentLabels.push('NI')
      if (d.bank_sort_code) presentLabels.push('Bank')
      if (d.cscs_card_type) presentLabels.push(`CSCS (${d.cscs_card_type}${d.cscs_expiry ? ', exp. ' + d.cscs_expiry : ''})`)
      if (d.has_verified_photo_id) presentLabels.push('Photo ID ✓')
      if (d.has_verified_rtw) presentLabels.push('RTW ✓')

      const totalMissing = missingRequired.length + missingOptional.length + missingDocs.length
      const totalPending = pendingDocs.length
      const totalOutstanding = totalMissing + totalPending
      return {
        // Minimal text — the missing_fields card contains all the detail.
        // Do NOT include raw profile data or ALF will list fields above the card.
        text_result: totalOutstanding > 0
          ? `Profile loaded — ${totalMissing > 0 ? `${totalMissing} missing` : ''}${totalMissing > 0 && totalPending > 0 ? ', ' : ''}${totalPending > 0 ? `${totalPending} needs verifying` : ''}. Card below.`
          : `Profile loaded — all key fields and documents present.`,
        rich_result: {
          type: 'missing_fields' as const,
          data: {
            operative_id: d.id,
            operative_name: `${d.first_name} ${d.last_name}`,
            ref: d.reference_number ?? 'N/A',
            trade: (d.trade_categories as { name: string } | null)?.name ?? null,
            status: d.status,
            required: missingRequired,
            optional: missingOptional,
            documents: missingDocs,
            pending_documents: pendingDocs,
            present: presentLabels,
          },
        },
      }
    }

    case 'get_stats': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      // Use count queries to get accurate totals — avoids the 1000-row PostgREST default cap
      const [
        { count: total },
        { count: working },
        { count: available },
        { count: verified },
        { count: blocked },
        { count: pendingDocs },
        { count: highCompleteness },
      ] = await Promise.all([
        db.from('operatives').select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID),
        db.from('operatives').select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('status', 'working'),
        db.from('operatives').select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('status', 'available'),
        db.from('operatives').select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('status', 'verified'),
        db.from('operatives').select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('status', 'blocked'),
        db.from('operatives').select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('status', 'pending_docs'),
        // data_completeness_score is out of 24; ≥22 = >90% complete
        db.from('operatives').select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID).gte('data_completeness_score', 22),
      ])

      const completenessPercent = total ? Math.round(((highCompleteness ?? 0) / total) * 100) : 0

      const statsData = [
        { label: 'Total', value: total ?? 0, color: 'blue' },
        { label: 'Working', value: working ?? 0, color: 'green' },
        { label: 'Available', value: available ?? 0, color: 'emerald' },
        { label: 'Verified', value: verified ?? 0, color: 'teal' },
        { label: 'Blocked', value: blocked ?? 0, color: 'red' },
        { label: 'Pending Docs', value: pendingDocs ?? 0, color: 'amber' },
        { label: '>90% Complete', value: highCompleteness ?? 0, color: 'purple' },
      ]

      return {
        text_result: `Operative stats: ${total ?? 0} total, ${working ?? 0} working, ${available ?? 0} available, ${blocked ?? 0} blocked, ${pendingDocs ?? 0} pending docs. Data completeness: ${highCompleteness ?? 0} operatives (${completenessPercent}%) have >90% complete records (score ≥22/24).`,
        rich_result: { type: 'stats_grid', data: statsData },
      }
    }

    case 'get_compliance': {
      const { data, error } = await supabase
        .from('operatives')
        .select('id, first_name, last_name, cscs_card_type, cscs_expiry, status')
        .eq('organization_id', ORG_ID)
        .not('cscs_expiry', 'is', null)
        .order('cscs_expiry')
        .limit(input.limit ?? 50)

      if (error) return { text_result: `Error fetching compliance data: ${error.message}` }

      const today = new Date()
      const expired = data?.filter(op => op.cscs_expiry && new Date(op.cscs_expiry) < today) ?? []
      const expiring30 = data?.filter(op => {
        if (!op.cscs_expiry) return false
        const exp = new Date(op.cscs_expiry)
        const diff = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        return diff >= 0 && diff <= 30
      }) ?? []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const complianceRows = (data ?? []).map((op: any) =>
        `- ${op.first_name} ${op.last_name} | CSCS: ${op.cscs_card_type ?? 'none'} | expires: ${op.cscs_expiry} | status: ${op.status}`
      ).join('\n')
      return {
        text_result: `Compliance check: ${expired.length} CSCS cards expired, ${expiring30.length} expiring within 30 days.\n${complianceRows}`,
        rich_result: null,
      }
    }

    case 'get_documents': {
      if (!input.operative_id) return { text_result: 'operative_id required for get_documents' }
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('operative_id', input.operative_id)
        .order('created_at', { ascending: false })

      if (error) return { text_result: `Error fetching documents: ${error.message}` }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docLines = (data ?? []).map((d: any) =>
        `- ${d.document_type} | status: ${d.status} | expiry: ${d.expiry_date ?? 'N/A'} | uploaded: ${d.created_at?.slice(0, 10)}`
      ).join('\n')

      return {
        text_result: `Found ${data?.length ?? 0} documents:\n${docLines || 'none'}`,
        rich_result: { type: 'document_list', data: data ?? [] },
      }
    }

    default:
      return { text_result: `Unknown action: ${input.action}` }
  }
}
