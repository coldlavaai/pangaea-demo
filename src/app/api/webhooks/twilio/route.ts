import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createServiceClient } from '@/lib/supabase/server'
import { handleInbound } from '@/lib/whatsapp/handler'

// Twilio sends webhook as application/x-www-form-urlencoded
// We need the raw body as a plain object for signature validation
async function parseFormBody(req: NextRequest): Promise<Record<string, string>> {
  const text = await req.text()
  const params: Record<string, string> = {}
  for (const [key, value] of new URLSearchParams(text)) {
    params[key] = value
  }
  return params
}

function twimlResponse(replyBody: string): NextResponse {
  const xml = replyBody
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(replyBody)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`

  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()

  if (!authToken) {
    console.error('[twilio-webhook] Missing TWILIO_AUTH_TOKEN')
    return new NextResponse('Server configuration error', { status: 500 })
  }

  // Parse body first (needed for both validation and processing)
  const params = await parseFormBody(req)

  // Use the canonical app URL for signature validation — avoids header mismatch issues on Vercel
  // Must exactly match the URL configured in the Twilio console
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  const webhookUrl = `${appUrl}/api/webhooks/twilio`

  // Validate Twilio signature
  const signature = req.headers.get('x-twilio-signature') ?? ''
  const isValid = twilio.validateRequest(authToken, signature, webhookUrl, params)
  console.log('[twilio-webhook] sig valid:', isValid, '| url:', webhookUrl)
  if (!isValid) {
    console.warn('[twilio-webhook] Invalid signature — rejecting')
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Extract message fields
  const messageSid: string = params['MessageSid'] ?? ''
  const from: string = (params['From'] ?? '').replace('whatsapp:', '')  // strip prefix → E.164
  const body: string = params['Body'] ?? ''
  const numMedia = parseInt(params['NumMedia'] ?? '0', 10)
  const mediaUrl = numMedia > 0 ? params['MediaUrl0'] : undefined
  const mediaType = numMedia > 0 ? params['MediaContentType0'] : undefined

  if (!messageSid || !from) {
    return twimlResponse('')
  }

  const supabase = createServiceClient()

  try {
    const reply = await handleInbound(supabase, {
      messageSid,
      from,
      to: (params['To'] ?? '').replace('whatsapp:', ''),
      body,
      mediaUrl,
      mediaType,
      numMedia,
    })

    return twimlResponse(reply)
  } catch (err) {
    console.error('[twilio-webhook] Unhandled error', err)
    // Always return 200 to Twilio — non-200 triggers retries
    return twimlResponse('')
  }
}
