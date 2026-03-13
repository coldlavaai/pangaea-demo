import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkImportPermission } from '@/lib/export/check-export'
import type { ParsedRow } from '@/lib/import/operative-importer'
import type { Database } from '@/types/database'
import { createNotification } from '@/lib/notifications/create'

type OperativeInsert = Database['public']['Tables']['operatives']['Insert']

export const maxDuration = 60

const BATCH_SIZE = 500

// Map rowIndex → inserted operative id
type RowIdMap = Map<number, string>

export async function POST(request: Request) {
  const allowed = await checkImportPermission()
  if (!allowed) {
    return NextResponse.json({ error: 'Not authorised to import data' }, { status: 403 })
  }

  const orgId = process.env.NEXT_PUBLIC_ORG_ID!
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: dbUser } = await service
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 401 })

  let body: {
    rows: ParsedRow[]
    filename: string
    isChunk?: boolean
    isFinalChunk?: boolean
    prevTotalCreated?: number
    prevTotalSkipped?: number
    prevTotalFailed?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { rows, filename, isChunk, isFinalChunk, prevTotalCreated, prevTotalSkipped, prevTotalFailed } = body
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
  }

  // Chunks arrive pre-filtered (no errors/duplicates) — importableRows = all rows
  const importableRows = isChunk ? rows : rows.filter(r => r.errors.length === 0 && !r.isDuplicate)

  // Collect full detail on every skipped row (errors or duplicates)
  const skippedRows = rows
    .filter(r => r.errors.length > 0 || r.isDuplicate)
    .map(r => ({
      row: r.rowIndex,
      name: [r.data['first_name'], r.data['last_name']].filter(Boolean).join(' ') || '(no name)',
      ni: r.data['ni_number'] ?? null,
      phone: r.data['phone'] ?? null,
      errors: r.errors,
      warnings: r.warnings,
      isDuplicate: r.isDuplicate,
      trade: r.tradeName || null,
    }))

  // Collect full detail on every warned row (imported but flagged)
  const warnedRows = rows
    .filter(r => r.errors.length === 0 && !r.isDuplicate && r.warnings.length > 0)
    .map(r => ({
      row: r.rowIndex,
      name: [r.data['first_name'], r.data['last_name']].filter(Boolean).join(' ') || '(no name)',
      ni: r.data['ni_number'] ?? null,
      phone: r.data['phone'] ?? null,
      warnings: r.warnings,
      trade: r.tradeName || null,
    }))

  let createdCount = 0
  let failedCount = 0
  const errors: Array<{ row: number; error: string }> = []
  const rowIdMap: RowIdMap = new Map()

  // Batch insert operatives, tracking rowIndex → operative id
  for (let i = 0; i < importableRows.length; i += BATCH_SIZE) {
    const batch = importableRows.slice(i, i + BATCH_SIZE)

    const inserts = batch.map(row => ({
      organization_id: orgId,
      status: (row.data['last_worked_date'] ? 'available' : 'prospect') as 'available' | 'prospect',
      source: 'bulk_import',
      entry_source: 'import',
      ...row.data,
    })) as unknown as OperativeInsert[]

    const { data: inserted, error } = await service
      .from('operatives')
      .insert(inserts)
      .select('id')

    if (error) {
      console.error('[import/confirm] batch insert error:', error)
      // Fall back to row-by-row to isolate failures
      for (const row of batch) {
        const { data: single, error: rowErr } = await service
          .from('operatives')
          .insert({
            organization_id: orgId,
            status: (row.data['last_worked_date'] ? 'available' : 'prospect') as 'available' | 'prospect',
            source: 'bulk_import',
            ...row.data,
          } as unknown as OperativeInsert)
          .select('id')
          .single()

        if (rowErr) {
          failedCount++
          errors.push({ row: row.rowIndex, error: rowErr.message })
        } else {
          createdCount++
          if (single) rowIdMap.set(row.rowIndex, (single as { id: string }).id)
        }
      }
    } else {
      createdCount += inserted?.length ?? batch.length
      // Map rowIndex → operative id using positional order (Supabase preserves insert order)
      if (inserted) {
        for (let j = 0; j < batch.length && j < inserted.length; j++) {
          rowIdMap.set(batch[j].rowIndex, (inserted[j] as { id: string }).id)
        }
      }
    }
  }

  const skippedCount = rows.length - importableRows.length

  // ── Insert operative_trades for all successfully created operatives ──────────
  const tradeInserts: Array<{
    organization_id: string
    operative_id: string
    trade_category_id: string
    is_primary: boolean
  }> = []

  for (const row of importableRows) {
    const operativeId = rowIdMap.get(row.rowIndex)
    if (!operativeId || !row.trades || row.trades.length === 0) continue

    let isPrimary = true
    for (const trade of row.trades) {
      if (!trade.matchedId) continue
      tradeInserts.push({
        organization_id: orgId,
        operative_id: operativeId,
        trade_category_id: trade.matchedId,
        is_primary: isPrimary,
      })
      isPrimary = false
    }
  }

  if (tradeInserts.length > 0) {
    for (let i = 0; i < tradeInserts.length; i += BATCH_SIZE) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).from('operative_trades').insert(tradeInserts.slice(i, i + BATCH_SIZE))
    }
  }

  // ── Insert operative_cscs_cards for multi-card operatives ───────────────────
  const cscsInserts: Array<{
    organization_id: string
    operative_id: string
    card_type: string
    scheme: string | null
    card_number: string | null
    card_title: string | null
    card_description: string | null
    expiry_date: string | null
    is_primary: boolean
  }> = []

  for (const row of importableRows) {
    const operativeId = rowIdMap.get(row.rowIndex)
    if (!operativeId || !row.cscsCards || row.cscsCards.length === 0) continue

    for (let i = 0; i < row.cscsCards.length; i++) {
      const card = row.cscsCards[i]
      const isPrimary = i === 0
      cscsInserts.push({
        organization_id: orgId,
        operative_id: operativeId,
        card_type: card.cardType,
        scheme: card.scheme,
        card_number: isPrimary ? (row.data['cscs_card_number'] as string ?? null) : null,
        card_title: isPrimary ? (row.data['cscs_card_title'] as string ?? null) : null,
        card_description: isPrimary ? (row.data['cscs_card_description'] as string ?? null) : null,
        expiry_date: isPrimary ? (row.data['cscs_expiry'] as string ?? null) : null,
        is_primary: isPrimary,
      })
    }
  }

  if (cscsInserts.length > 0) {
    for (let i = 0; i < cscsInserts.length; i += BATCH_SIZE) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).from('operative_cscs_cards').insert(cscsInserts.slice(i, i + BATCH_SIZE))
    }
  }

  // ── Upsert agencies and link to operatives ──────────────────────────────────
  const agencyNames = new Set<string>()
  for (const row of importableRows) {
    if (row.agencyName && rowIdMap.has(row.rowIndex)) agencyNames.add(row.agencyName)
  }

  if (agencyNames.size > 0) {
    const agencyInserts = [...agencyNames].map(name => ({ organization_id: orgId, name }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).from('agencies').upsert(agencyInserts, { onConflict: 'organization_id,name', ignoreDuplicates: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agencies } = await (service as any)
      .from('agencies')
      .select('id, name')
      .eq('organization_id', orgId)
      .in('name', [...agencyNames])

    if (agencies) {
      const agencyMap = new Map((agencies as { id: string; name: string }[]).map(a => [a.name, a.id]))

      // Group operative IDs by agency for batch updates
      const byAgency = new Map<string, string[]>()
      for (const row of importableRows) {
        const operativeId = rowIdMap.get(row.rowIndex)
        if (!operativeId || !row.agencyName) continue
        const agencyId = agencyMap.get(row.agencyName)
        if (!agencyId) continue
        const arr = byAgency.get(agencyId) ?? []
        arr.push(operativeId)
        byAgency.set(agencyId, arr)
      }

      for (const [agencyId, operativeIds] of byAgency) {
        for (let i = 0; i < operativeIds.length; i += BATCH_SIZE) {
          await service
            .from('operatives')
            .update({ agency_id: agencyId } as unknown as OperativeInsert)
            .in('id', operativeIds.slice(i, i + BATCH_SIZE))
        }
      }
    }
  }

  // Only write audit log + notification on the final chunk (or non-chunked import)
  if (!isChunk || isFinalChunk) {
    const totalCreated = createdCount + (prevTotalCreated ?? 0)
    const totalSkipped = skippedCount + (prevTotalSkipped ?? 0)
    const totalFailed  = failedCount  + (prevTotalFailed  ?? 0)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logRow } = await (service as any).from('import_logs').insert({
      organization_id: orgId,
      imported_by: (dbUser as { id: string }).id,
      filename,
      total_rows: totalCreated + totalSkipped + totalFailed,
      created_count: totalCreated,
      skipped_count: totalSkipped,
      failed_count: totalFailed,
      errors: errors.length > 0 ? errors : null,
      skipped_rows: skippedRows.length > 0 ? skippedRows : null,
      warned_rows: warnedRows.length > 0 ? warnedRows : null,
    }).select('id').single()

    const logId = (logRow as { id: string } | null)?.id ?? null

    const parts = [`${totalCreated} imported`]
    if (totalSkipped > 0) parts.push(`${totalSkipped} skipped`)
    if (totalFailed > 0) parts.push(`${totalFailed} failed`)

    await createNotification(service, {
      type: 'bulk_import',
      title: `Import complete — ${totalCreated} operatives added`,
      body: `${parts.join(' · ')} · File: ${filename}`,
      severity: totalFailed > 0 ? 'warning' : 'info',
      link_url: logId ? `/operatives/import/history` : `/operatives`,
      push: true,
    })
  }

  return NextResponse.json({
    created: createdCount,
    skipped: skippedCount,
    failed: failedCount,
    errors: errors.slice(0, 20),
  })
}
