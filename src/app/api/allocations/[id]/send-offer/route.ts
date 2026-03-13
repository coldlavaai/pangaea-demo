import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER! // whatsapp:+447414157366
const DEFAULT_OFFER_WINDOW_MINUTES = 30

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check: only authenticated users can send offers
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id: allocationId } = await params

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || TWILIO_ACCOUNT_SID === 'AC_PLACEHOLDER') {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 })
  }

  const supabase = createServiceClient()

  // Load allocation + operative + site + org settings
  const { data: alloc, error: allocErr } = await supabase
    .from('allocations')
    .select(`
      id, status, start_date, end_date, agreed_day_rate, offer_sent_at, induction_token,
      operative:operatives!allocations_operative_id_fkey(id, first_name, last_name, phone),
      site:sites!allocations_site_id_fkey(name, address, postcode),
      org:organizations!inner(settings)
    `)
    .eq('id', allocationId)
    .single()

  if (allocErr || !alloc) {
    return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
  }

  if (alloc.status !== 'pending') {
    return NextResponse.json({ error: `Cannot send offer for allocation with status: ${alloc.status}` }, { status: 400 })
  }

  const operative = alloc.operative as { id: string; first_name: string; last_name: string; phone: string } | null
  const site = alloc.site as { name: string; address: string; postcode: string } | null
  const orgSettings = (alloc.org as { settings: Record<string, unknown> } | null)?.settings ?? {}
  const inductionToken = (alloc as Record<string, unknown>).induction_token as string | null
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim()
  const inductionUrl = inductionToken ? `${appUrl}/induction/${inductionToken}` : null
  const offerWindowMinutes = (orgSettings.offer_window_minutes as number | undefined) ?? DEFAULT_OFFER_WINDOW_MINUTES

  if (!operative?.phone) {
    return NextResponse.json({ error: 'Operative has no phone number' }, { status: 400 })
  }

  const offerExpiresAt = new Date(Date.now() + offerWindowMinutes * 60 * 1000)
  const startDateFormatted = new Date(alloc.start_date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  const endDateText = alloc.end_date
    ? ` to ${new Date(alloc.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`
    : ''
  const dayRateText = alloc.agreed_day_rate ? ` at £${Number(alloc.agreed_day_rate).toFixed(2)}/day` : ''

  const message = `Hi ${operative.first_name}! 👷

We have a job offer for you:

📍 *${site?.name ?? 'Site TBC'}*
${site?.address ? `${site.address}, ${site.postcode}` : ''}

📅 *${startDateFormatted}${endDateText}*${dayRateText ? `\n💷 *${dayRateText.trim()}*` : ''}

Reply *YES* to accept or *NO* to decline.
${inductionUrl ? `\n📋 Before your first day, please complete your company induction:\n${inductionUrl}\n` : ''}
This offer expires in ${offerWindowMinutes} minutes. ⏱️`

  // Normalise phone to WhatsApp format
  const toNumber = operative.phone.startsWith('whatsapp:')
    ? operative.phone
    : `whatsapp:${operative.phone.replace(/\s/g, '')}`

  // Send via Twilio Messages API
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const body = new URLSearchParams({
    From: TWILIO_WHATSAPP_NUMBER,
    To: toNumber,
    Body: message,
  })

  const twilioRes = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!twilioRes.ok) {
    const err = await twilioRes.text()
    console.error('Twilio error:', err)
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 502 })
  }

  const twilioData = (await twilioRes.json()) as { sid: string }

  // Update allocation: offer_sent_at, offer_expires_at
  const { error: updateErr } = await supabase
    .from('allocations')
    .update({
      offer_sent_at: new Date().toISOString(),
      offer_expires_at: offerExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', allocationId)

  if (updateErr) {
    console.error('Failed to update allocation after send:', updateErr.message)
  }

  // Log message to messages table (if thread exists)
  const { data: thread } = await supabase
    .from('message_threads')
    .select('id')
    .eq('operative_id', operative.id)
    .single()

  if (thread) {
    await supabase.from('messages').insert({
      organization_id: process.env.NEXT_PUBLIC_ORG_ID!,
      thread_id: thread.id,
      operative_id: operative.id,
      direction: 'outbound',
      body: message,
      external_id: twilioData.sid,
      status: 'sent',
    })
  }

  return NextResponse.json({ success: true, message_sid: twilioData.sid, expires_at: offerExpiresAt.toISOString() })
}
