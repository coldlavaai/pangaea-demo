/**
 * Workflow Processor Cron — runs every 15 minutes (see vercel.json)
 *
 * Actions:
 * 1. Find all active workflow_runs
 * 2. For each, find targets where next_follow_up_at <= NOW
 * 3. If messages_sent < max_follow_ups → call onFollowUp
 * 4. If messages_sent >= max_follow_ups → call onTimeout (escalate)
 * 5. Check if run is complete (all targets resolved)
 */

import { NextRequest, NextResponse } from 'next/server'
import { processFollowUps } from '@/lib/workflows/engine'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await processFollowUps()
    console.log('[workflow-processor] completed', result)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[workflow-processor] cron error', err)
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
}
