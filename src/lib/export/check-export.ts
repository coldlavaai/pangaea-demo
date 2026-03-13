/**
 * Export/import permission gate.
 * - checkExportPermission: returns true if allowed. If blocked, fires a Telegram alert to Oliver.
 * - checkImportPermission: returns true if allowed.
 */

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendNotifyBot } from '@/lib/telegram/send-notify'

// Oliver's Telegram chat ID — receives all blocked-export alerts
const OLIVER_TELEGRAM_ID = 1640953016

/** Silent check — just returns boolean. Use in server components to show/hide UI. */
export async function getCanExport(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const service = createServiceClient()
  const { data: dbUser } = await service
    .from('users')
    .select('can_export')
    .eq('auth_user_id', user.id)
    .single() as { data: { can_export: boolean } | null }

  return dbUser?.can_export === true
}

/** Alerting check — blocks AND fires Telegram DM to Oliver. Use in API routes only. */
export async function checkExportPermission(exportType: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const service = createServiceClient()
  const { data: dbUser } = await service
    .from('users')
    .select('id, first_name, last_name, email, can_export')
    .eq('auth_user_id', user.id)
    .single() as { data: { id: string; first_name: string | null; last_name: string | null; email: string | null; can_export: boolean } | null }

  if (!dbUser) return false
  if (dbUser.can_export) return true

  // Blocked — alert Oliver immediately via Telegram DM
  const name = [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ') || dbUser.email || 'Unknown user'
  const ts = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'short',
    timeStyle: 'medium',
  })

  // Fire and forget — don't await to avoid blocking response
  sendNotifyBot(
    OLIVER_TELEGRAM_ID,
    `\u{1F6A8} *Export Attempt Blocked*\n\n*${name}* (${dbUser.email ?? 'no email'}) tried to export *${exportType}* data\n\u{1F550} ${ts}`,
  ).catch(console.error)

  return false
}

export async function checkImportPermission(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const service = createServiceClient()
  const { data: dbUser } = await service
    .from('users')
    .select('can_import')
    .eq('auth_user_id', user.id)
    .single() as { data: { can_import: boolean } | null }

  return dbUser?.can_import === true
}
