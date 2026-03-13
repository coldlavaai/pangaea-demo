import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTelegram } from '@/lib/telegram/send'

const OWNER_CHAT_ID = 1640953016

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'

  const userAgent = req.headers.get('user-agent') ?? 'unknown'
  const email = user?.email ?? 'unauthenticated'

  const message = [
    `🚨 *EXPORT ATTEMPT DETECTED*`,
    ``,
    `👤 *User:* ${email}`,
    `🕐 *Time:* ${now}`,
    `🌐 *IP:* \`${ip}\``,
    `📱 *Agent:* ${userAgent.slice(0, 80)}`,
  ].join('\n')

  await sendTelegram(OWNER_CHAT_ID, message)

  // Return a harmless non-download response
  return NextResponse.json({ error: 'Export is not available. Contact your administrator.' }, { status: 403 })
}
