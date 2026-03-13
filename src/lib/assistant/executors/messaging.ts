import { createClient } from '@/lib/supabase/server'
import { sendWhatsApp, sendWhatsAppTemplate } from '@/lib/whatsapp/send'
import type { ToolResult } from '../types'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeMessaging(input: any): Promise<ToolResult> {
  if (!input.confirmed) return { text_result: 'CONFIRMATION_REQUIRED', rich_result: null }

  const supabase = await createClient()

  switch (input.action) {
    case 'send_whatsapp': {
      if (!input.operative_id || !input.message) return { text_result: 'operative_id and message required' }

      // Get operative phone
      const { data: op } = await supabase
        .from('operatives')
        .select('phone, first_name, last_name')
        .eq('id', input.operative_id)
        .eq('organization_id', ORG_ID)
        .single()

      if (!op?.phone) return { text_result: 'Operative has no phone number.' }

      try {
        await sendWhatsApp(op.phone, input.message)
        return { text_result: `WhatsApp message sent to ${op.first_name} ${op.last_name} (${op.phone}).` }
      } catch (err) {
        return { text_result: `Failed to send WhatsApp: ${err instanceof Error ? err.message : String(err)}` }
      }
    }

    case 'bulk_send_whatsapp': {
      if (!input.operative_ids?.length || !input.message) return { text_result: 'operative_ids and message required' }

      const { data: operatives } = await supabase
        .from('operatives')
        .select('id, phone, first_name, last_name')
        .in('id', input.operative_ids)
        .eq('organization_id', ORG_ID)

      let sent = 0, failed = 0
      const failures: string[] = []

      for (const op of operatives ?? []) {
        if (!op.phone) { failed++; failures.push(`${op.first_name} ${op.last_name} (no phone)`); continue }
        try {
          await sendWhatsApp(op.phone, input.message)
          sent++
        } catch (err) {
          failed++
          failures.push(`${op.first_name} ${op.last_name}: ${err instanceof Error ? err.message : String(err)}`)
        }
        // Rate limit: 1/second
        await new Promise(r => setTimeout(r, 1000))
      }

      const summary = `Bulk WhatsApp: ${sent} sent, ${failed} failed.${failures.length ? ` Failures: ${failures.slice(0, 3).join('; ')}${failures.length > 3 ? '...' : ''}` : ''}`
      return {
        text_result: summary,
        rich_result: { type: 'stats_grid', data: [
          { label: 'Sent', value: sent, color: 'green' },
          { label: 'Failed', value: failed, color: 'red' },
          { label: 'Total', value: (operatives?.length ?? 0), color: 'blue' },
        ] },
      }
    }

    case 'send_whatsapp_template': {
      if (!input.operative_id || !input.template_sid) return { text_result: 'operative_id and template_sid required' }
      const { data: op } = await supabase
        .from('operatives').select('phone, first_name, last_name')
        .eq('id', input.operative_id).eq('organization_id', ORG_ID).single()
      if (!op?.phone) return { text_result: 'Operative has no phone number.' }
      try {
        await sendWhatsAppTemplate(op.phone, input.template_sid, input.template_variables ?? {})
        return { text_result: `WhatsApp template sent to ${op.first_name} ${op.last_name}.` }
      } catch (err) {
        return { text_result: `Failed: ${err instanceof Error ? err.message : String(err)}` }
      }
    }

    case 'bulk_send_whatsapp_template': {
      if (!input.operative_ids?.length || !input.template_sid) return { text_result: 'operative_ids and template_sid required' }
      const { data: operatives } = await supabase
        .from('operatives').select('id, phone, first_name, last_name')
        .in('id', input.operative_ids).eq('organization_id', ORG_ID)

      let sent = 0, failed = 0
      const failures: string[] = []
      // template_variables_map: { [operativeId]: { '1': value, '2': value, ... } }
      // OR shared template_variables for all (Claude fills in per-person vars)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const varMap: Record<string, Record<string, string>> = input.template_variables_map ?? {}
      const sharedVars: Record<string, string> = input.template_variables ?? {}

      for (const op of operatives ?? []) {
        if (!op.phone) { failed++; failures.push(`${op.first_name} ${op.last_name} (no phone)`); continue }
        const vars = varMap[op.id] ?? { ...sharedVars, '1': op.first_name }
        try {
          await sendWhatsAppTemplate(op.phone, input.template_sid, vars)
          sent++
        } catch (err) {
          failed++
          failures.push(`${op.first_name} ${op.last_name}: ${err instanceof Error ? err.message : String(err)}`)
        }
        await new Promise(r => setTimeout(r, 1000))
      }

      const summary = `Bulk WhatsApp template: ${sent} sent, ${failed} failed.${failures.length ? ` Failures: ${failures.slice(0, 3).join('; ')}` : ''}`
      return {
        text_result: summary,
        rich_result: { type: 'stats_grid', data: [
          { label: 'Sent', value: sent, color: 'green' },
          { label: 'Failed', value: failed, color: 'red' },
          { label: 'Total', value: (operatives?.length ?? 0), color: 'blue' },
        ] },
      }
    }

    case 'send_telegram': {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID
      if (!botToken || !chatId) return { text_result: 'Telegram not configured.' }

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: input.message, parse_mode: 'Markdown' }),
      })
      if (!res.ok) return { text_result: `Telegram error: ${res.statusText}` }
      return { text_result: 'Telegram message sent.' }
    }

    default:
      return { text_result: `Messaging action ${input.action} not yet implemented.` }
  }
}
