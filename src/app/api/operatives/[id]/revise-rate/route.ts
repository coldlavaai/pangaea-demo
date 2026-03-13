import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const body = await req.json().catch(() => ({}))
  const { grade, quartile, day_rate, reason } = body

  if (!grade || !quartile || !day_rate || !reason) {
    return NextResponse.json(
      { error: 'grade, quartile, day_rate, and reason are required' },
      { status: 400 }
    )
  }

  const dayRate = Number(day_rate)
  const hourlyRate = Math.round((dayRate / 8) * 100) / 100

  // Verify operative exists
  const { error: opErr } = await supabase
    .from('operatives')
    .select('id')
    .eq('id', id)
    .eq('organization_id', ORG_ID)
    .single()

  if (opErr) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Insert revised rate history row
  const { error: insertErr } = await supabase.from('operative_pay_rates').insert({
    organization_id: ORG_ID,
    operative_id: id,
    day_rate: dayRate,
    hourly_rate: hourlyRate,
    grade,
    quartile,
    rate_type: 'revised',
    rationale: reason,
  })

  if (insertErr) {
    console.error('[revise-rate] insert error', insertErr)
    return NextResponse.json({ error: 'Failed to save rate' }, { status: 500 })
  }

  // Update operative
  await supabase
    .from('operatives')
    .update({
      day_rate: dayRate,
      hourly_rate: hourlyRate,
      grade,
      rate_status: 'confirmed',
    })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
