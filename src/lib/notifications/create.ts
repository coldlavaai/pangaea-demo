import type { SupabaseClient } from '@supabase/supabase-js'
import { sendNotifyBot } from '@/lib/telegram/send-notify'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://pangaea-demo.vercel.app').trim()

interface CreateNotificationParams {
  type:
    | 'arrive' | 'ncr' | 'rap' | 'labour_request' | 'finish'
    | 'application_complete' | 'document_uploaded' | 'cscs_uploaded'
    | 'offer_accepted' | 'offer_declined'
    | 'compliance_block' | 'doc_expiring_30' | 'doc_expiring_60' | 'doc_expiring_90'
    | 'request_ending' | 'missing_timesheet' | 'goodwill_doc_reminder'
    | 'bulk_import'
    | 'operative_deleted'
    | 'send_failed'
  title: string
  body?: string | null
  severity: 'info' | 'warning' | 'critical'
  operative_id?: string | null
  labour_request_id?: string | null
  ncr_id?: string | null
  link_url?: string | null
  /** If true, also send Telegram DM via @RexNotifyBot to subscribed users */
  push: boolean
}

export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams,
): Promise<void> {
  try {
    // Insert notification row (visible in BOS bell + activity feed)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('notifications') as any).insert({
      organization_id: ORG_ID,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      severity: params.severity,
      operative_id: params.operative_id ?? null,
      labour_request_id: params.labour_request_id ?? null,
      ncr_id: params.ncr_id ?? null,
      link_url: params.link_url ?? null,
      read: false,
    })

    // Send Telegram DM via @RexNotifyBot to subscribed admin/staff
    if (params.push) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: subscribers } = await (supabase.from('users') as any)
        .select('telegram_chat_id')
        .eq('organization_id', ORG_ID)
        .eq('is_active', true)
        .eq('receive_notifications', true)
        .not('telegram_chat_id', 'is', null)

      if (subscribers && subscribers.length > 0) {
        const emoji =
          params.severity === 'critical' ? '🔴' :
          params.severity === 'warning'  ? '🟠' : 'ℹ️'

        const text = `${emoji} *${params.title}*${params.body ? `\n${params.body}` : ''}`
        const urlButtons = params.link_url
          ? [{ text: '🔗 View in Rex', url: `${APP_URL}${params.link_url}` }]
          : undefined

        await Promise.allSettled(
          subscribers.map((u: { telegram_chat_id: number }) =>
            sendNotifyBot(u.telegram_chat_id, text, urlButtons)
          )
        )
      }
    }
  } catch (err) {
    // Non-fatal — notification failure never breaks the main flow
    console.error('[notifications] createNotification error:', err)
  }
}
