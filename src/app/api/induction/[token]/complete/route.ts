import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsApp } from '@/lib/whatsapp/send'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: allocation } = await supabase
    .from('allocations')
    .select(`
      id, induction_complete,
      operative:operatives!allocations_operative_id_fkey(first_name, phone)
    `)
    .eq('induction_token', token)
    .eq('organization_id', ORG_ID)
    .maybeSingle()

  if (!allocation) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  }

  if (allocation.induction_complete) {
    return NextResponse.json({ error: 'Already completed' }, { status: 409 })
  }

  const body = await req.json()
  const { medical, declarations, signature } = body

  if (!signature?.full_name || !medical || !declarations) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error: updateErr } = await supabase
    .from('allocations')
    .update({
      induction_complete: true,
      induction_completed_at: new Date().toISOString(),
      induction_data: { medical, declarations, signature },
      updated_at: new Date().toISOString(),
    })
    .eq('id', allocation.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Send WhatsApp confirmation to operative
  const operative = allocation.operative as { first_name: string; phone: string } | null
  if (operative?.phone) {
    await sendWhatsApp(
      operative.phone,
      `Hi ${operative.first_name}! Your company induction with Pangaea has been completed and recorded. You are all set for your first day. See you on site!`
    ).catch(err => console.error('Induction WhatsApp confirmation failed:', err))
  }

  return NextResponse.json({ success: true })
}
