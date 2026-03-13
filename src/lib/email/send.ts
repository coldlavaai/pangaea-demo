/**
 * Email sending via Microsoft Graph API (delegated OAuth).
 * Admin connects their Outlook/365 account once via Settings → Integrations.
 * Tokens are stored in `email_integrations` table and auto-refreshed here.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { refreshAccessToken, sendGraphMail } from './outlook-auth'
import { getTemplate, renderTemplate } from './templates'
import { getRoleNote, buildTelegramSection, buildInviteShell } from './template-defs'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://aztec-landscapes-bos.vercel.app').trim()

// ─── Token management ─────────────────────────────────────────────────────────

type EmailIntegration = {
  id: string
  email_address: string
  access_token: string
  refresh_token: string
  token_expires_at: string
}

async function getValidToken(): Promise<{ token: string; fromEmail: string } | null> {
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: integration } = await (supabase as any).from('email_integrations')
    .select('id, email_address, access_token, refresh_token, token_expires_at')
    .eq('organization_id', ORG_ID)
    .eq('provider', 'outlook')
    .maybeSingle() as { data: EmailIntegration | null }

  if (!integration) {
    console.warn('[email] No Outlook integration connected — skipping email send')
    return null
  }

  const isExpired = new Date(integration.token_expires_at) <= new Date(Date.now() + 60_000) // 1-min buffer

  if (!isExpired) {
    return { token: integration.access_token, fromEmail: integration.email_address }
  }

  // Refresh
  try {
    const refreshed = await refreshAccessToken(integration.refresh_token)
    if (refreshed.error) {
      console.error('[email] Token refresh failed:', refreshed.error_description)
      return null
    }

    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('email_integrations')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? integration.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id)

    return { token: refreshed.access_token, fromEmail: integration.email_address }
  } catch (err) {
    console.error('[email] Token refresh error:', err)
    return null
  }
}

// ─── Email log ────────────────────────────────────────────────────────────────

async function logEmail(params: {
  to_email: string
  to_name?: string | null
  subject: string
  template: string
  status: 'sent' | 'failed'
  error?: string | null
}): Promise<void> {
  try {
    const supabase = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('email_log').insert({
      organization_id: ORG_ID,
      to_email: params.to_email,
      to_name: params.to_name ?? null,
      subject: params.subject,
      template: params.template,
      status: params.status,
      error: params.error ?? null,
    })
  } catch (err) {
    console.error('[email] logEmail failed:', err)
  }
}

// ─── Core send function ───────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  template: string,
  toName?: string | null,
): Promise<void> {
  const auth = await getValidToken()
  if (!auth) {
    await logEmail({ to_email: to, to_name: toName, subject, template, status: 'failed', error: 'No Outlook integration connected' })
    return
  }

  try {
    await sendGraphMail(auth.token, to, subject, html)
    await logEmail({ to_email: to, to_name: toName, subject, template, status: 'sent' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await logEmail({ to_email: to, to_name: toName, subject, template, status: 'failed', error: msg })
    throw err
  }
}
// ─── Public send functions ────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  site_manager: 'Site Manager',
  auditor: 'Auditor',
  director: 'Director',
  labour_manager: 'Labour Manager',
  project_manager: 'Project Manager',
}

export async function sendInviteEmail({
  to,
  firstName,
  role,
  inviteLink,
}: {
  to: string
  firstName: string
  role: string
  inviteLink: string
  isSiteManager?: boolean
}): Promise<void> {
  const roleLabel = ROLE_LABELS[role] ?? role
  const template = await getTemplate('invite_user')

  // Substitute content variables into the editable body
  const contentHtml = renderTemplate(template.body_html, {
    first_name: firstName,
    role_label: roleLabel,
    role_note: getRoleNote(role),
  })

  // Wrap in branded email shell (header, CTA, telegram section, footer)
  const html = buildInviteShell({
    contentHtml,
    roleLabel,
    inviteLink,
    appUrl: APP_URL,
    telegramSection: buildTelegramSection(role, firstName),
  })

  const subject = renderTemplate(template.subject, {
    first_name: firstName,
    role_label: roleLabel,
  })

  await sendEmail(to, subject, html, 'invite_user', firstName)
}
