/**
 * Send a message via @AlfNotificationsBot (admin notification bot).
 * Separate from @AztecSiteBot which handles site manager commands.
 *
 * Uses a persistent reply keyboard (docked at bottom of chat input)
 * rather than inline keyboards on every message, so the chat stays clean.
 */

type ReplyKeyboard = { keyboard: { text: string }[][]; resize_keyboard: boolean; persistent?: boolean }
type InlineButton = { text: string; url: string }

// Persistent keyboard shown at the bottom of the chat input area.
// Pressing a button sends its text as a message — handled in the webhook.
const PERSISTENT_KEYBOARD: ReplyKeyboard = {
  keyboard: [
    [{ text: '🔔 Unread' },   { text: '📋 Recent' }],
    [{ text: '⚠️ NCRs' },     { text: '🏗️ Requests' }],
    [{ text: '📊 Status' },   { text: '✅ Mark read' }],
  ],
  resize_keyboard: true,
  persistent: true,
}

/**
 * Send a message. The persistent keyboard is always attached (it just stays docked,
 * doesn't create a new button block on each message).
 *
 * @param urlButtons  Optional inline URL buttons shown below the message text
 *                    (e.g. "🔗 View NCR →"). These open URLs, not callbacks.
 */
export async function sendNotifyBot(
  chatId: number,
  text: string,
  urlButtons?: InlineButton[],
): Promise<void> {
  const token = process.env.TELEGRAM_NOTIFY_TOKEN
  if (!token) {
    console.error('[notify-bot] TELEGRAM_NOTIFY_TOKEN not set')
    return
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    reply_markup: PERSISTENT_KEYBOARD,
  }

  // If we have view-link buttons, override reply_markup with inline keyboard
  // (url-type inline buttons are fine per-message — they're contextual, not noisy)
  if (urlButtons && urlButtons.length > 0) {
    body.reply_markup = {
      inline_keyboard: [urlButtons.map(b => ({ text: b.text, url: b.url }))],
    }
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[notify-bot] sendMessage error:', err)
  }
}

export async function answerCallback(callbackQueryId: string): Promise<void> {
  const token = process.env.TELEGRAM_NOTIFY_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  })
}
