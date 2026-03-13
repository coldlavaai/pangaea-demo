import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendNotifyBot, answerCallback } from '@/lib/telegram/send-notify'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://aztec-landscapes-bos.vercel.app').trim()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Handle inline button presses (legacy — shouldn't fire now but keep for safety)
    if (body?.callback_query) {
      const cq = body.callback_query
      await answerCallback(cq.id)
      await handleCommand(cq.message.chat.id, cq.data)
      return NextResponse.json({ ok: true })
    }

    // Handle text messages (including reply keyboard button presses)
    const message = body?.message
    if (!message) return NextResponse.json({ ok: true })
    const chatId: number = message.chat?.id
    const text: string = (message.text ?? '').trim()
    if (!chatId || !text) return NextResponse.json({ ok: true })

    await handleCommand(chatId, normalizeCmd(text))
  } catch (err) {
    console.error('[telegram-notify webhook]', err)
  }
  return NextResponse.json({ ok: true })
}

// Normalise command text from both typed commands and reply keyboard button presses.
// Reply keyboard sends the button label as-is, e.g. "🔔 Unread" or "✅ Mark read".
function normalizeCmd(raw: string): string {
  const s = raw.toLowerCase().trim()
  if (s === '/start' || s === 'hi' || s === 'hello' || s === 'hey') return '/start'
  if (s.includes('unread'))  return 'unread'
  if (s.includes('recent') || s.includes('latest')) return 'recent'
  if (s.includes('ncr'))     return 'ncrs'
  if (s.includes('request') || s.includes('labour')) return 'requests'
  if (s.includes('status'))  return 'status'
  if (s.includes('mark'))    return 'markread'
  return s
}

async function handleCommand(chatId: number, cmd: string) {
  const supabase = createServiceClient()

  // Verify sender is a linked user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: user } = await (supabase.from('users') as any)
    .select('id, first_name, receive_notifications')
    .eq('organization_id', ORG_ID)
    .eq('is_active', true)
    .eq('telegram_chat_id', chatId)
    .maybeSingle()

  if (!user) {
    await sendNotifyBot(chatId, "⚠️ Your Telegram account isn't linked to ALF\\. Ask an admin to link it in Settings\\.")
    return
  }

  const name = user.first_name ?? 'there'

  // ── /start or greeting ────────────────────────────────────────────────────
  if (cmd === '/start') {
    await sendNotifyBot(chatId,
      `👋 Hi *${name}\\!* I'm the *ALF Notifications Bot*\\.\n\nI'll DM you when things happen on the platform\\. Use the buttons below to query live data\\.`
    )
    return
  }

  // ── Recent ────────────────────────────────────────────────────────────────
  if (cmd === 'recent') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: notifications } = await (supabase.from('notifications') as any)
      .select('title, body, type, created_at')
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!notifications?.length) {
      await sendNotifyBot(chatId, '📋 No notifications yet\\.')
    } else {
      const lines = (notifications as { title: string; body: string | null; created_at: string }[])
        .map(n => `• *${escMd(n.title)}*${n.body ? ` — ${escMd(n.body)}` : ''} _\\(${timeAgo(n.created_at)}\\)_`)
        .join('\n')
      await sendNotifyBot(chatId, `📋 *Last 5 notifications:*\n\n${lines}`)
    }
    return
  }

  // ── Unread ────────────────────────────────────────────────────────────────
  if (cmd === 'unread') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: notifications } = await (supabase.from('notifications') as any)
      .select('title, body, created_at')
      .eq('organization_id', ORG_ID)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!notifications?.length) {
      await sendNotifyBot(chatId, '✅ No unread notifications\\.')
    } else {
      const lines = (notifications as { title: string; body: string | null; created_at: string }[])
        .map(n => `• *${escMd(n.title)}*${n.body ? ` — ${escMd(n.body)}` : ''} _\\(${timeAgo(n.created_at)}\\)_`)
        .join('\n')
      await sendNotifyBot(chatId, `🔔 *${notifications.length} unread:*\n\n${lines}`)
    }
    return
  }

  // ── NCRs ──────────────────────────────────────────────────────────────────
  if (cmd === 'ncrs') {
    const { data: ncrs } = await supabase
      .from('non_conformance_incidents')
      .select(`
        id, description, severity, incident_type, created_at,
        site:sites!non_conformance_incidents_site_id_fkey(name),
        operative:operatives!non_conformance_incidents_operative_id_fkey(first_name, last_name)
      `)
      .eq('organization_id', ORG_ID)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!ncrs?.length) {
      await sendNotifyBot(chatId, '✅ No open NCRs\\.')
    } else {
      type NcrRow = {
        id: string
        description: string
        severity: string
        incident_type: string | null
        created_at: string
        site: { name: string } | null
        operative: { first_name: string; last_name: string } | null
      }

      const blocks = (ncrs as NcrRow[]).map((n, i) => {
        const sev = n.severity.toUpperCase()
        const site = n.site?.name ?? 'Unknown site'
        const op = n.operative ? `${n.operative.first_name} ${n.operative.last_name}` : null
        const type = n.incident_type ? ncr_type_label(n.incident_type) : null
        const desc = n.description.length > 80 ? n.description.slice(0, 80) + '…' : n.description
        const age = timeAgo(n.created_at)

        const lines = [
          `*${i + 1}\\. \\[${sev}\\] ${escMd(site)}*${op ? ` — ${escMd(op)}` : ''}`,
          type ? `_${escMd(type)}_` : null,
          escMd(desc),
          `_Raised ${age}_`,
        ].filter(Boolean).join('\n')

        return { text: lines, id: n.id }
      })

      const body = blocks.map(b => b.text).join('\n\n─────────────────\n\n')
      const urlButtons = blocks.map((b, i) => ({
        text: `🔗 View NCR ${i + 1}`,
        url: `${APP_URL}/ncrs/${b.id}`,
      }))

      await sendNotifyBot(chatId, `⚠️ *Open NCRs \\(${ncrs.length}\\):*\n\n${body}`, urlButtons)
    }
    return
  }

  // ── Labour requests ───────────────────────────────────────────────────────
  if (cmd === 'requests') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: requests } = await (supabase.from('labour_requests') as any)
      .select('id, headcount, start_date, trade_category:trade_categories(name), site:sites!labour_requests_site_id_fkey(name)')
      .eq('organization_id', ORG_ID)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)

    if (!requests?.length) {
      await sendNotifyBot(chatId, '✅ No pending labour requests\\.')
    } else {
      type RequestRow = { id: string; headcount: number; start_date: string; trade_category: { name: string } | null; site: { name: string } | null }

      const blocks = (requests as RequestRow[]).map((r, i) => {
        const site = r.site?.name ?? 'Unknown site'
        const trade = r.trade_category?.name ?? 'Unknown trade'
        const text = `*${i + 1}\\. ${escMd(site)}*\n${r.headcount}× ${escMd(trade)} from ${escMd(r.start_date)}`
        return { text, id: r.id }
      })

      const body = blocks.map(b => b.text).join('\n\n')
      const urlButtons = blocks.map((b, i) => ({
        text: `🔗 View Request ${i + 1}`,
        url: `${APP_URL}/requests/${b.id}`,
      }))

      await sendNotifyBot(chatId, `🏗️ *Pending requests \\(${requests.length}\\):*\n\n${body}`, urlButtons)
    }
    return
  }

  // ── Status ────────────────────────────────────────────────────────────────
  if (cmd === 'status') {
    const [
      { count: activeOps },
      { count: openNcrs },
      { count: pendingRequests },
      { count: unreadNotifs },
    ] = await Promise.all([
      supabase.from('operatives').select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('status', 'working'),
      supabase.from('non_conformance_incidents').select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('resolved', false),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('labour_requests') as any).select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('status', 'pending'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('notifications') as any).select('*', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('read', false),
    ])

    await sendNotifyBot(chatId,
      `📊 *ALF Platform Status*\n\n` +
      `👷 Working operatives: *${activeOps ?? 0}*\n` +
      `⚠️ Open NCRs: *${openNcrs ?? 0}*\n` +
      `🏗️ Pending requests: *${pendingRequests ?? 0}*\n` +
      `🔔 Unread notifications: *${unreadNotifs ?? 0}*`
    )
    return
  }

  // ── Mark all read ─────────────────────────────────────────────────────────
  if (cmd === 'markread') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('notifications') as any)
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('organization_id', ORG_ID)
      .eq('read', false)
    if (error) {
      await sendNotifyBot(chatId, '❌ Failed to mark notifications as read\\.')
    } else {
      await sendNotifyBot(chatId, '✅ All notifications marked as read\\.')
    }
    return
  }

  // ── Default ───────────────────────────────────────────────────────────────
  await sendNotifyBot(chatId,
    `Use the buttons below, or type:\n\n• \`recent\` — last 5 notifications\n• \`unread\` — unread only\n• \`ncrs\` — open NCRs\n• \`requests\` — pending requests\n• \`status\` — platform summary`
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// Escape Telegram MarkdownV2 special chars
function escMd(s: string): string {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}

function ncr_type_label(type: string): string {
  const labels: Record<string, string> = {
    no_show: 'No Show',
    walk_off: 'Walk Off',
    late_arrival: 'Late Arrival',
    safety_breach: 'Safety Breach',
    drugs_alcohol: 'Drugs / Alcohol',
    conduct_issue: 'Conduct Issue',
    poor_attitude: 'Poor Attitude',
    poor_workmanship: 'Poor Workmanship',
    other: 'Other',
  }
  return labels[type] ?? type
}
