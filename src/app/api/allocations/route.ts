import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canAllocate } from '@/lib/compliance/can-allocate'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { operativeId, labourRequestId, siteId, startDate, endDate, agreedDayRate, orgId } = body

  if (!operativeId || !labourRequestId || !siteId || !startDate || !orgId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Run all compliance pre-checks
  const check = await canAllocate(supabase, operativeId, labourRequestId)

  if (!check.canAllocate) {
    return NextResponse.json(
      { error: 'Compliance check failed', blockers: check.blockers, warnings: check.warnings },
      { status: 422 }
    )
  }

  // Insert allocation
  const { data, error } = await supabase
    .from('allocations')
    .insert({
      organization_id: orgId,
      operative_id: operativeId,
      labour_request_id: labourRequestId,
      site_id: siteId,
      start_date: startDate,
      end_date: endDate ?? null,
      agreed_day_rate: agreedDayRate ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    // Surface DB-level WTD trigger errors cleanly
    const msg = error.message.includes('Working Time')
      ? error.message
      : `Failed to create allocation: ${error.message}`
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ allocation: data, warnings: check.warnings })
}
