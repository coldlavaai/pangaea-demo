const API_BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export type InlineButton = { text: string; callback_data: string }
export type InlineKeyboard = { inline_keyboard: InlineButton[][] }
export type ReplyKeyboard = {
  keyboard: string[][]
  resize_keyboard: boolean
  is_persistent: boolean
  one_time_keyboard?: boolean
}

/** Send a plain text message, optionally with an inline keyboard */
export async function sendTelegram(
  chatId: number | string,
  text: string,
  replyMarkup?: InlineKeyboard | ReplyKeyboard,
): Promise<void> {
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup ?? undefined,
    }),
  })
  if (!res.ok) console.error('[telegram] sendMessage failed:', await res.text())
}

/** Answer a callback query (required — stops the loading spinner on the button) */
export async function answerCallback(callbackQueryId: string, text?: string): Promise<void> {
  await fetch(`${API_BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  })
}

/** Remove inline keyboard from a previous message (clean up after selection) */
export async function clearInlineKeyboard(chatId: number | string, messageId: number): Promise<void> {
  await fetch(`${API_BASE}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    }),
  })
}

/** The persistent reply keyboard shown at the bottom of every chat */
export const MAIN_MENU: ReplyKeyboard = {
  keyboard: [
    ['📍 Mark Arrived', '⚠️ Log NCR'],
    ['⭐ Rate Operative', '🏗️ Request Labour'],
    ['🔚 Finish Operative', '❓ Help'],
    ['🔄 Reset'],
  ],
  resize_keyboard: true,
  is_persistent: true,
}

export async function registerTelegramWebhook(): Promise<unknown> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const res = await fetch(`${API_BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${appUrl}/api/webhooks/telegram`,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
    }),
  })
  return res.json()
}
