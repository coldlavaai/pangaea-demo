import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Twilio message status callback endpoint.
 * Receives delivery status updates (queued → sent → delivered → read → failed)
 * and updates the corresponding messages row by external_id (MessageSid).
 *
 * Configure in Twilio Console or via statusCallback param in messages.create().
 * No signature validation here — status callbacks use the same webhook URL pattern
 * but payloads are minimal. Low risk: only updates status fields, no data returned.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const text = await req.text()
    const params: Record<string, string> = {}
    for (const [key, value] of new URLSearchParams(text)) {
      params[key] = value
    }

    const messageSid = params['MessageSid']
    const messageStatus = params['MessageStatus'] // queued | sent | delivered | read | failed | undelivered

    if (!messageSid || !messageStatus) {
      return new NextResponse('OK', { status: 200 })
    }

    const supabase = createServiceClient()

    // Update message status — only if the record exists (some sends are fire-and-forget)
    const { error } = await supabase
      .from('messages')
      .update({
        status: messageStatus,
        ...(messageStatus === 'failed' || messageStatus === 'undelivered'
          ? { error_message: params['ErrorMessage'] ?? params['ErrorCode'] ?? 'Delivery failed' }
          : {}),
      })
      .eq('external_id', messageSid)

    if (error) {
      console.error('[twilio-status] update error:', error.message)
    }

    return new NextResponse('OK', { status: 200 })
  } catch (err) {
    console.error('[twilio-status] unexpected error:', err)
    return new NextResponse('OK', { status: 200 }) // Always 200 — Twilio retries on non-200
  }
}
