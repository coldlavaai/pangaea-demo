import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkImportPermission } from '@/lib/export/check-export'
import { parseOperativesCSV } from '@/lib/import/operative-importer'

export const maxDuration = 60

export async function POST(request: Request) {
  const allowed = await checkImportPermission()
  if (!allowed) {
    return NextResponse.json({ error: 'Not authorised to import data' }, { status: 403 })
  }

  const orgId = process.env.NEXT_PUBLIC_ORG_ID!
  const service = createServiceClient()

  // Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowedTypes = ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel']
  if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
    return NextResponse.json(
      { error: 'Only CSV files are supported. Please export your spreadsheet as CSV and try again.' },
      { status: 400 },
    )
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const csvText = await file.text()

  // Load trade categories for matching
  const { data: tradeCategories } = await service
    .from('trade_categories')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('is_active', true)

  // Load existing phones + NI numbers for duplicate detection
  const { data: existing } = await service
    .from('operatives')
    .select('phone, ni_number')
    .eq('organization_id', orgId)

  const existingPhones = new Set<string>((existing ?? []).map(r => r.phone).filter(Boolean) as string[])
  const existingNIs = new Set<string>(
    (existing ?? []).map(r => r.ni_number).filter(Boolean) as string[],
  )

  const result = parseOperativesCSV(
    csvText,
    tradeCategories ?? [],
    existingPhones,
    existingNIs,
  )

  // Return full rows (for confirm step) + preview (first 20 for display)
  return NextResponse.json({
    summary: {
      total: result.total,
      valid: result.valid,
      withWarnings: result.withWarnings,
      withErrors: result.withErrors,
      duplicates: result.duplicates,
      unmappedHeaders: result.unmappedHeaders,
    },
    preview: result.rows.slice(0, 20),
    rows: result.rows, // All rows — client holds in memory for confirm
    filename: file.name,
  })
}
