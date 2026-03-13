/**
 * Client-safe email template definitions, shell builders, and helpers.
 * No server imports — safe to use in both client components and server code.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateVariable {
  key: string
  label: string
  example: string
}

export interface TemplateDefinition {
  key: string
  name: string
  description: string
  variables: TemplateVariable[]  // content variables shown as editor chips
  defaultSubject: string
  defaultBodyHtml: string        // TipTap content HTML (not full email HTML)
}

// ─── Default content (TipTap-compatible HTML — no email shell/chrome) ─────────

const INVITE_DEFAULT_CONTENT = `<h2>You're invited, {{first_name}}</h2>
<p>You've been added as <strong>{{role_label}}</strong> on the Aztec Construction platform.</p>
<p>{{role_note}}</p>
<p>Click the button below to set your password and sign in. The link expires in <strong>24 hours</strong>.</p>`

// ─── Role helpers ─────────────────────────────────────────────────────────────

export function getRoleNote(role: string): string {
  if (role === 'site_manager') return 'You can log operative arrivals, raise NCRs, submit RAP scores and labour requests — all from Telegram.'
  if (role === 'admin')        return 'You have full admin access to all BOS features including user management, reports, and notifications.'
  return 'You have access to the BOS dashboard for your assigned areas.'
}

// ─── Telegram section builder ─────────────────────────────────────────────────

function tgStep(num: string, title: string, detail: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin-bottom:14px;width:100%;"><tr>
    <td style="vertical-align:top;padding-right:12px;padding-top:1px;width:28px;">
      <span style="display:inline-block;width:24px;height:24px;background:#1a3a5c;border-radius:50%;text-align:center;font-size:11px;font-weight:800;color:#38bdf8;line-height:24px;border:1px solid #2563eb40;">${num}</span>
    </td>
    <td style="vertical-align:top;">
      <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#e2e8f0;line-height:1.4;">${title}</p>
      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">${detail}</p>
    </td>
  </tr></table>`
}

function commandRow(icon: string, name: string, desc: string): string {
  return `<tr>
    <td style="padding:5px 8px 5px 0;vertical-align:top;width:130px;white-space:nowrap;">
      <span style="font-size:12px;color:#38bdf8;font-family:monospace;font-weight:600;">${icon} ${name}</span>
    </td>
    <td style="padding:5px 0;font-size:12px;color:#64748b;line-height:1.4;">${desc}</td>
  </tr>`
}

function downloadBadge(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin:3px 4px 3px 0;padding:6px 12px;background:#1e293b;border:1px solid #334155;border-radius:6px;font-size:11px;font-weight:600;color:#94a3b8;text-decoration:none;white-space:nowrap;">${label}</a>`
}

export function buildTelegramSection(role: string, firstName: string): string {
  if (role === 'site_manager') {
    return `<tr><td style="padding:0 32px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;border-radius:10px;border:1px solid #1e3a5f;overflow:hidden;">

        <!-- Section header -->
        <tr><td style="background:#0d1f3c;padding:16px 24px;border-bottom:1px solid #1e3a5f;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#38bdf8;letter-spacing:1px;text-transform:uppercase;">Step 2 — Telegram Setup</p>
              <p style="margin:0;font-size:13px;color:#94a3b8;">@AztecSiteBot is your main tool for managing operatives on site.</p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="font-size:22px;">💬</span>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:20px 24px;">

          <!-- Don't have Telegram? -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:6px;border:1px solid #1e293b;margin-bottom:20px;"><tr><td style="padding:12px 14px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Don&apos;t have Telegram yet? Download it free:</p>
            <div>
              ${downloadBadge('https://apps.apple.com/app/telegram-messenger/id686449807', '📱 iPhone / iPad')}
              ${downloadBadge('https://play.google.com/store/apps/details?id=org.telegram.messenger', '🤖 Android')}
              ${downloadBadge('https://desktop.telegram.org/', '💻 Desktop / Mac')}
            </div>
          </td></tr></table>

          <!-- Open bot CTA -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
            <td style="background:#1d4ed8;border-radius:7px;box-shadow:0 3px 10px rgba(29,78,216,0.4);">
              <a href="https://t.me/AztecSiteBot" style="display:inline-block;padding:11px 22px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;">
                Open @AztecSiteBot in Telegram &#8594;
              </a>
            </td>
          </tr></table>

          <!-- Steps -->
          <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">How to get verified:</p>
          ${tgStep('1', 'Open @AztecSiteBot', 'Tap the blue button above or search @AztecSiteBot in Telegram, then press <strong style="color:#e2e8f0;">Start</strong>.')}
          ${tgStep('2', `Send your email address`, `The bot will ask for your registered email. Type: <strong style="color:#e2e8f0;">(your work email)</strong> and send it.`)}
          ${tgStep('3', 'Check your email for a code', 'A 6-digit verification code will arrive in your inbox within a minute. Check spam if you don&apos;t see it.')}
          ${tgStep('4', 'Send the code back to the bot', 'Reply with the 6-digit code. The bot will confirm your identity and unlock the site manager menu.')}
          ${tgStep('5', 'You&apos;re in!', 'The full command menu appears automatically. You can now log arrivals, raise NCRs, and more — direct from Telegram.')}

          <!-- Divider -->
          <div style="border-top:1px solid #1e293b;margin:18px 0;"></div>

          <!-- Commands -->
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Available commands:</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${commandRow('✅', 'Arrive', 'Log an operative arriving on site')}
            ${commandRow('⚠️', 'NCR', 'Raise a non-conformance report')}
            ${commandRow('⭐', 'RAP', 'Submit a performance score')}
            ${commandRow('🏗️', 'Request Labour', 'Submit a new labour request')}
            ${commandRow('🏁', 'Finish', 'Mark an operative as finished for the day')}
          </table>

        </td></tr>
      </table>
    </td></tr>`
  }

  if (role === 'admin' || role === 'staff') {
    return `<tr><td style="padding:0 32px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;border-radius:10px;border:1px solid #1e3a5f;overflow:hidden;">

        <!-- Section header -->
        <tr><td style="background:#0d1f3c;padding:16px 24px;border-bottom:1px solid #1e3a5f;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td>
              <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:#38bdf8;letter-spacing:1px;text-transform:uppercase;">Step 2 — Telegram Notifications (optional)</p>
              <p style="margin:0;font-size:13px;color:#94a3b8;">Get live BOS alerts and query the platform direct from Telegram.</p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="font-size:22px;">🔔</span>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:20px 24px;">

          <!-- Don't have Telegram? -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:6px;border:1px solid #1e293b;margin-bottom:20px;"><tr><td style="padding:12px 14px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Don&apos;t have Telegram yet? Download it free:</p>
            <div>
              ${downloadBadge('https://apps.apple.com/app/telegram-messenger/id686449807', '📱 iPhone / iPad')}
              ${downloadBadge('https://play.google.com/store/apps/details?id=org.telegram.messenger', '🤖 Android')}
              ${downloadBadge('https://desktop.telegram.org/', '💻 Desktop / Mac')}
            </div>
          </td></tr></table>

          <!-- Steps -->
          <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Setup in 4 steps:</p>

          ${tgStep('1', 'Find your Telegram Chat ID',
            `Open Telegram and message <a href="https://t.me/userinfobot" style="color:#38bdf8;text-decoration:none;font-weight:600;">@userinfobot</a> — it will instantly reply with your numeric Chat ID (e.g. <strong style="color:#e2e8f0;">123456789</strong>). Copy it.`)}

          ${tgStep('2', 'Add your Chat ID to your profile',
            `In the BOS, go to <strong style="color:#e2e8f0;">Settings → Users</strong>, click your name, paste the Chat ID into the <strong style="color:#e2e8f0;">Telegram Chat ID</strong> field, and save.`)}

          ${tgStep('3', 'Enable notifications',
            `On the same profile screen, turn on <strong style="color:#e2e8f0;">Receive Notifications</strong>. You&apos;ll now get instant Telegram messages for arrivals, NCRs, requests, and alerts.`)}

          ${tgStep('4', 'Open @AlfNotificationsBot',
            `Message <a href="https://t.me/AlfNotificationsBot" style="color:#38bdf8;text-decoration:none;font-weight:600;">@AlfNotificationsBot</a> on Telegram to access the live query menu. Use the buttons to check unread alerts, pending requests, open NCRs, and platform status — any time.`)}

          <!-- Open bot CTA -->
          <table cellpadding="0" cellspacing="0" style="margin-top:18px;margin-bottom:8px;"><tr>
            <td style="background:#1d4ed8;border-radius:7px;box-shadow:0 3px 10px rgba(29,78,216,0.4);">
              <a href="https://t.me/AlfNotificationsBot" style="display:inline-block;padding:11px 22px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;">
                Open @AlfNotificationsBot &#8594;
              </a>
            </td>
          </tr></table>

          <!-- Divider -->
          <div style="border-top:1px solid #1e293b;margin:18px 0;"></div>

          <!-- Commands -->
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Bot commands:</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${commandRow('🔔', 'Unread', 'View unread notifications')}
            ${commandRow('📋', 'Recent', 'Last 5 platform events')}
            ${commandRow('⚠️', 'NCRs', 'Open non-conformance incidents')}
            ${commandRow('🏗️', 'Requests', 'Pending labour requests')}
            ${commandRow('📊', 'Status', 'Live platform summary')}
          </table>

        </td></tr>
      </table>
    </td></tr>`
  }

  return ''
}

// ─── Invite email shell ───────────────────────────────────────────────────────
// Wraps TipTap content HTML in the full branded email envelope.
// Used server-side for sending and client-side for live preview.

export function buildInviteShell({
  contentHtml,
  roleLabel,
  inviteLink,
  appUrl,
  telegramSection,
}: {
  contentHtml: string
  roleLabel: string
  inviteLink: string
  appUrl: string
  telegramSection: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    h1,h2,h3{margin:0 0 10px;font-weight:700;}
    h2{font-size:24px;color:#f9fafb;}
    h3{font-size:16px;color:#e2e8f0;}
    p{margin:0 0 12px;font-size:14px;color:#9ca3af;line-height:1.7;}
    p:last-child{margin-bottom:0;}
    strong{color:#e2e8f0;}
    a{color:#38bdf8;text-decoration:none;}
    ul,ol{margin:0 0 12px;padding-left:22px;color:#9ca3af;font-size:14px;line-height:1.7;}
  </style>
</head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#111827;border-radius:12px;border:1px solid #1f2937;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:24px 32px;border-bottom:1px solid #1f2937;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:3px;">ALF</p>
                <p style="margin:2px 0 0;font-size:10px;color:#4b5563;letter-spacing:2px;text-transform:uppercase;">Aztec Construction</p>
              </td>
              <td align="right">
                <span style="display:inline-block;padding:5px 12px;background:#10b981;border-radius:100px;font-size:11px;font-weight:700;color:#fff;letter-spacing:0.5px;white-space:nowrap;">${roleLabel}</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- User-editable content -->
        <tr>
          <td style="padding:32px 32px 16px;">
            ${contentHtml}
          </td>
        </tr>

        <!-- CTA button -->
        <tr>
          <td style="padding:8px 32px 24px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Step 1 — Access the dashboard</p>
            <table cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
              <td style="background:#10b981;border-radius:8px;box-shadow:0 4px 14px rgba(16,185,129,0.3);">
                <a href="${inviteLink}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                  Set Password &amp; Sign In &#8594;
                </a>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Dashboard URL -->
        <tr>
          <td style="padding:0 32px 20px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Dashboard URL</p>
            <a href="${appUrl}" style="font-size:13px;color:#38bdf8;text-decoration:none;">${appUrl}</a>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="border-top:1px solid #1f2937;"></div></td></tr>

        <!-- Telegram section (auto-generated) -->
        <tr><td style="padding:20px 0 0;"></td></tr>
        ${telegramSection}

        <!-- Invite link fallback -->
        <tr>
          <td style="padding:0 32px 24px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;">Invite link (if button doesn&apos;t work)</p>
            <p style="margin:0;font-size:11px;color:#374151;word-break:break-all;font-family:monospace;background:#0f172a;padding:8px 12px;border-radius:4px;border:1px solid #1f2937;">${inviteLink}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;border-top:1px solid #1f2937;padding:16px 32px;">
            <p style="margin:0;font-size:11px;color:#374151;">Aztec Construction · Aztec Landscapes Ltd · This is an automated message.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Template definitions ─────────────────────────────────────────────────────

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    key: 'invite_user',
    name: 'New User Invite',
    description: 'Sent when an admin invites a new user. Contains set-password link and role-specific Telegram setup guide.',
    variables: [
      { key: 'first_name',  label: 'First Name',       example: 'James' },
      { key: 'role_label',  label: 'Role',             example: 'Site Manager' },
      { key: 'role_note',   label: 'Role description', example: 'You can log operative arrivals, raise NCRs and submit RAP scores.' },
    ],
    defaultSubject: `You've been invited to Aztec Construction`,
    defaultBodyHtml: INVITE_DEFAULT_CONTENT,
  },
]

// ─── Variable substitution ────────────────────────────────────────────────────

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [key, value]) => t.replaceAll(`{{${key}}}`, value),
    template
  )
}
