/**
 * Microsoft OAuth helpers for delegated email sending via Graph API.
 * User logs in once via Microsoft → tokens stored in email_integrations table
 * → auto-refreshed on each send.
 */

export interface OutlookTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  error?: string
  error_description?: string
}

function getConfig() {
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common'
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://aztec-landscapes-bos.vercel.app').trim()
  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri: `${appUrl}/api/integrations/outlook/callback`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
  }
}

const SCOPES = ['offline_access', 'Mail.Send', 'User.Read'].join(' ')

export function getAuthUrl(state: string): string {
  const { clientId, tenantId, redirectUri } = getConfig()
  if (!clientId) throw new Error('MICROSOFT_CLIENT_ID not set')

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_mode: 'query',
    state,
    prompt: 'select_account',
  })
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`
}

export async function exchangeCode(code: string): Promise<OutlookTokens> {
  const { clientId, clientSecret, redirectUri, tokenEndpoint } = getConfig()
  if (!clientId || !clientSecret) throw new Error('Microsoft OAuth env vars not set')

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      scope: SCOPES,
    }),
  })
  return res.json() as Promise<OutlookTokens>
}

export async function refreshAccessToken(storedRefreshToken: string): Promise<OutlookTokens> {
  const { clientId, clientSecret, tokenEndpoint } = getConfig()
  if (!clientId || !clientSecret) throw new Error('Microsoft OAuth env vars not set')

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: storedRefreshToken,
      scope: SCOPES,
    }),
  })
  return res.json() as Promise<OutlookTokens>
}

export async function getGraphProfile(accessToken: string): Promise<{ mail: string | null; displayName: string | null }> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return { mail: null, displayName: null }
  const json = await res.json() as { mail?: string; userPrincipalName?: string; displayName?: string }
  return {
    mail: json.mail ?? json.userPrincipalName ?? null,
    displayName: json.displayName ?? null,
  }
}

export async function sendGraphMail(
  accessToken: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph sendMail failed: ${err}`)
  }
}
