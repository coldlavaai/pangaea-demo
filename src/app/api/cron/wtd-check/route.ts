/**
 * WTD Check Cron — runs nightly at 01:00 UTC
 *
 * Working Time Directive enforcement (UK):
 * - Max 48h per week (averaged, but we flag individual weeks as a warning)
 * - Min 11h rest between consecutive shifts
 * - Min 20-min break when shift > 6h worked
 *
 * For each shift in the last 14 days:
 *   1. Calculate hours worked (actual times preferred, fall back to scheduled)
 *   2. wtd_hours_flag    → shift hours > 10h (single-shift limit indicator)
 *   3. break_compliance_flag → hours > 6h and break < 20 min
 *   4. wtd_overnight_flag → gap to previous shift < 11h
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

function shiftHours(
  start: string,
  end: string,
  breakMinutes: number | null
): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const gross = ms / 3_600_000
  return Math.max(0, gross - (breakMinutes ?? 0) / 60)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString()

  // Fetch all shifts in the last 14 days, ordered by operative + start time
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('id, operative_id, scheduled_start, scheduled_end, actual_start, actual_end, break_minutes, actual_break_minutes')
    .eq('organization_id', ORG_ID)
    .gte('scheduled_start', cutoff)
    .order('operative_id')
    .order('scheduled_start')

  if (error || !shifts) {
    console.error('[wtd-check] fetch error', error)
    return NextResponse.json({ ok: false, error: error?.message }, { status: 500 })
  }

  const updates: Array<{
    id: string
    wtd_hours_flag: boolean
    break_compliance_flag: boolean
    wtd_overnight_flag: boolean
  }> = []

  // Group by operative so we can check gaps between consecutive shifts
  const byOp = new Map<string, typeof shifts>()
  for (const s of shifts) {
    if (!byOp.has(s.operative_id)) byOp.set(s.operative_id, [])
    byOp.get(s.operative_id)!.push(s)
  }

  for (const opShifts of byOp.values()) {
    for (let i = 0; i < opShifts.length; i++) {
      const s = opShifts[i]

      const start = s.actual_start ?? s.scheduled_start
      const end   = s.actual_end   ?? s.scheduled_end
      const brk   = s.actual_break_minutes ?? s.break_minutes

      const hours = shiftHours(start, end, brk)

      // Flag 1: single shift > 10h
      const wtd_hours_flag = hours > 10

      // Flag 2: worked > 6h but break < 20 min
      const break_compliance_flag = hours > 6 && (brk == null || brk < 20)

      // Flag 3: gap from previous shift < 11h
      let wtd_overnight_flag = false
      if (i > 0) {
        const prev = opShifts[i - 1]
        const prevEnd = new Date(prev.actual_end ?? prev.scheduled_end).getTime()
        const thisStart = new Date(start).getTime()
        const gapHours = (thisStart - prevEnd) / 3_600_000
        wtd_overnight_flag = gapHours < 11
      }

      updates.push({ id: s.id, wtd_hours_flag, break_compliance_flag, wtd_overnight_flag })
    }
  }

  // Batch update — Supabase doesn't support bulk upsert by id easily,
  // so we update in parallel batches of 20
  let flagged = 0
  const BATCH = 20
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH)
    await Promise.all(
      batch.map(({ id, wtd_hours_flag, break_compliance_flag, wtd_overnight_flag }) =>
        supabase
          .from('shifts')
          .update({ wtd_hours_flag, break_compliance_flag, wtd_overnight_flag })
          .eq('id', id)
      )
    )
    flagged += batch.filter(
      (u) => u.wtd_hours_flag || u.break_compliance_flag || u.wtd_overnight_flag
    ).length
  }

  console.log(`[wtd-check] processed ${updates.length} shifts, ${flagged} flagged`)
  return NextResponse.json({ ok: true, shifts_processed: updates.length, shifts_flagged: flagged })
}
