import twilio from 'twilio'
import { translateText } from '@/lib/translate'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const FROM = process.env.TWILIO_WHATSAPP_NUMBER! // 'whatsapp:+447414157366'

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
 * `contentVariables` — map of variable positions to values e.g. { '1': 'Oliver', '2': 'CSCS card' }
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
  return message.sid
}
