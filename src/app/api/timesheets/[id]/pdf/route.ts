import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { TimesheetPDF } from '@/components/timesheets/timesheet-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const [{ data: ts }, { data: entries }] = await Promise.all([
    supabase
      .from('timesheets')
      .select(`
        *,
        operative:operatives!timesheets_operative_id_fkey(
          id, first_name, last_name, reference_number, phone, utr_number, ni_number
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .single(),
    supabase
      .from('timesheet_entries')
      .select('*')
      .eq('timesheet_id', id)
      .order('entry_date', { ascending: true }),
  ])

  if (!ts) return new NextResponse('Not found', { status: 404 })

  const op = ts.operative as {
    first_name: string; last_name: string; reference_number: string | null
    phone: string | null; utr_number: string | null; ni_number: string | null
  } | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(TimesheetPDF as any, { ts: { ...ts, operative: op }, entries: entries ?? [] }) as any
  const buffer = await renderToBuffer(element)

  const name = op ? `${op.first_name}-${op.last_name}` : 'operative'
  const filename = `timesheet-${name}-${ts.week_start}.pdf`

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
