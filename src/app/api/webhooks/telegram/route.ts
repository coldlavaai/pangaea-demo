import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleTelegramSiteManager, handleTelegramCallback } from '@/lib/telegram/site-manager-handler'
import { sendTelegram, answerCallback, MAIN_MENU } from '@/lib/telegram/send'

export const runtime = 'nodejs'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret && secret !== expectedSecret.trim()) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  let update: TelegramUpdate
  try {
    update = await req.json()
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const supabase = createServiceClient()

  // ── Callback query (inline button tap) ────────────────────────────────────
  if (update.callback_query) {
    const cq = update.callback_query
    const chatId = cq.message?.chat.id
    const messageId = cq.message?.message_id

    if (!chatId || !messageId) {
      return NextResponse.json({ ok: true })
    }

    // Must answer callback immediately or button shows a loading spinner
    await answerCallback(cq.id)

    try {
      const reply = await handleTelegramCallback(supabase, chatId, cq.data ?? '', messageId)
      if (reply) {
        await sendTelegram(chatId, reply.text, reply.keyboard ?? MAIN_MENU)
        // Log the bot's reply to the thread (callback action label as inbound, reply as outbound)
        const label = cq.data ? `[button: ${cq.data}]` : '[button tap]'
        await logTelegramMessages(chatId, label, reply.text)
      }
    } catch (err) {
      console.error('[telegram webhook] callback error', err)
      await sendTelegram(chatId, 'Something went wrong. Please try again.', MAIN_MENU)
    }

    return NextResponse.json({ ok: true })
  }

  // ── Regular message ────────────────────────────────────────────────────────
  const message = update.message
  if (!message?.text || !message.chat?.id || message.chat.type !== 'private') {
    return NextResponse.json({ ok: true })
  }

  const chatId = message.chat.id
  const text = message.text
  const fromName = message.from?.first_name ?? 'User'

  // Handle /reset command before main handler
  if (text.trim().toLowerCase() === '/reset' || text.trim().toLowerCase() === '/clear') {
    const tgPhone = `tg:${chatId}`
    await supabase
      .from('message_threads')
      .update({ intake_state: null, intake_data: null })
      .eq('phone_number', tgPhone)
      .eq('organization_id', ORG_ID)
    await sendTelegram(chatId, '🔄 Session reset. Use the menu buttons to get started.', MAIN_MENU)
    await logTelegramMessages(chatId, text, '🔄 Session reset. Use the menu buttons to get started.')
    return NextResponse.json({ ok: true })
  }

  try {
    const reply = await handleTelegramSiteManager(supabase, chatId, text, fromName)
    if (reply) {
      // Always send with MAIN_MENU (persistent reply keyboard) unless reply has inline keyboard
      await sendTelegram(chatId, reply.text, reply.keyboard ?? MAIN_MENU)
      await logTelegramMessages(chatId, text, reply.text)
    }
  } catch (err) {
    console.error('[telegram webhook] handler error', err)
    await sendTelegram(chatId, 'Something went wrong. Please try again.', MAIN_MENU)
  }

  return NextResponse.json({ ok: true })

  // ── Message logger ─────────────────────────────────────────────────────────
  async function logTelegramMessages(
    tgChatId: number,
    inboundText: string,
    outboundText: string,
  ): Promise<void> {
    try {
      const tgPhone = `tg:${tgChatId}`
      const { data: thread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('phone_number', tgPhone)
        .eq('organization_id', ORG_ID)
        .maybeSingle()

      if (!thread?.id) return

      await supabase.from('messages').insert([
        {
          organization_id: ORG_ID,
          thread_id: thread.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          channel: 'telegram' as any,
          direction: 'inbound' as const,
          body: inboundText,
          status: 'received',
        },
        {
          organization_id: ORG_ID,
          thread_id: thread.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          channel: 'telegram' as any,
          direction: 'outbound' as const,
          body: outboundText,
          status: 'sent',
        },
      ])

      // Update thread last_message
      await supabase
        .from('message_threads')
        .update({
          last_message: outboundText.slice(0, 200),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', thread.id)
    } catch (err) {
      // Non-fatal: don't let logging failure break the bot
      console.error('[telegram] message logging failed:', err)
    }
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; first_name: string; username?: string }
    chat: { id: number; type: 'private' | 'group' | 'supergroup' | 'channel' }
    text?: string
    date: number
  }
  callback_query?: {
    id: string
    from: { id: number; first_name: string }
    message?: {
      message_id: number
      chat: { id: number }
    }
    data?: string
  }
}
