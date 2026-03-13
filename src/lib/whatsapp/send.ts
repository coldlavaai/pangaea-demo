import twilio from 'twilio'
import { translateText } from '@/lib/translate'
import { createServiceClient } from '@/lib/supabase/server'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const FROM = process.env.TWILIO_WHATSAPP_NUMBER! // 'whatsapp:+447723325497'
const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

/**
 * Log an outbound message to the messages table so it appears in the WhatsApp tab.
 */
async function logOutboundMessage(to: string, body: string, externalId?: string) {
  try {
    const supabase = createServiceClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
    const phone = to.replace('whatsapp:', '')

    // Find the thread for this phone
    const { data: thread } = await supabase
      .from('message_threads')
      .select('id, operative_id')
      .eq('phone_number', phone)
      .eq('organization_id', ORG_ID)
      .maybeSingle()

    if (thread) {
      await supabase.from('messages').insert({
        organization_id: ORG_ID,
        thread_id: thread.id,
        operative_id: thread.operative_id,
        channel: 'whatsapp',
        direction: 'outbound',
        body,
        external_id: externalId ?? null,
        status: 'sent',
      })

      await supabase
        .from('message_threads')
        .update({ last_message: body, last_message_at: new Date().toISOString() })
        .eq('id', thread.id)
    }
  } catch (err) {
    console.error('[send] Failed to log outbound message:', err)
  }
}

/**
 * Send a freeform WhatsApp message (only works within 24h of last operative message).
 * `to` should be a raw E.164 number (e.g. '+447700900000') — we add the whatsapp: prefix.
 */
export async function sendWhatsApp(to: string, body: string): Promise<string> {
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim()
  const message = await client.messages.create({
    from: FROM,
    to: toFormatted,
    body,
    statusCallback: `${appUrl}/api/webhooks/twilio/status`,
  })

  // Log to database
  await logOutboundMessage(to, body, message.sid)

  return message.sid
}

/**
 * Send a freeform WhatsApp message, translating to the operative's language first.
 * If language is 'en' or not provided, sends as-is.
 * Returns the SID and the actual body that was sent (translated or original).
 */
export async function sendTranslatedWhatsApp(
  to: string,
  body: string,
  language?: string | null,
): Promise<{ sid: string; sentBody: string }> {
  let sentBody = body
  if (language && language !== 'en') {
    const { translated, wasTranslated } = await translateText(body, language)
    if (wasTranslated) sentBody = translated
  }
  const sid = await sendWhatsApp(to, sentBody)
  return { sid, sentBody }
}

/**
 * Send a WhatsApp HSM template message (works outside 24h window — Meta pre-approved).
 * `to` — raw E.164 number.
 * `contentSid` — Twilio Content Template SID (HX...).
 * `contentVariables` — map of variable positions to values e.g. { '1': 'Oliver', '2': 'Cold Lava Construction' }
 */
export async function sendWhatsAppTemplate(
  to: string,
  contentSid: string,
  contentVariables: Record<string, string>
): Promise<string> {
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const message = await client.messages.create({
    from: FROM,
    to: toFormatted,
    contentSid,
    contentVariables: JSON.stringify(contentVariables),
  })

  // Log template send — construct the body from variables for display
  const templateBody = `[Template] ${Object.values(contentVariables).join(' | ')}`
  await logOutboundMessage(to, templateBody, message.sid)

  return message.sid
}
