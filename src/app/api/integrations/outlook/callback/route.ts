import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'
import { exchangeCode, getGraphProfile } from '@/lib/email/outlook-auth'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://aztec-landscapes-bos.vercel.app').trim()

function redirect(path: string) {
  return NextResponse.redirect(`${APP_URL}${path}`)
}

export async function GET(req: NextRequest) {
  const role = await getUserRole()
  if (role !== 'admin' && role !== 'super_admin') return redirect('/settings?tab=integrations&error=Unauthorized')

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const returnedState = searchParams.get('state')
  const oauthError = searchParams.get('error')

  // User cancelled or Microsoft returned an error
  if (oauthError) {
    return redirect(`/settings?tab=integrations&error=${encodeURIComponent(oauthError)}`)
  }

  if (!code || !returnedState) {
    return redirect('/settings?tab=integrations&error=Missing+code+or+state')
  }

  // Verify CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get('outlook_oauth_state')?.value
  cookieStore.delete('outlook_oauth_state')

  if (!savedState || savedState !== returnedState) {
    return redirect('/settings?tab=integrations&error=Invalid+state')
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code)
    if (tokens.error) {
      return redirect(`/settings?tab=integrations&error=${encodeURIComponent(tokens.error_description ?? tokens.error)}`)
    }

    // Fetch the user's email address and display name
    const profile = await getGraphProfile(tokens.access_token)
    if (!profile.mail) {
      return redirect('/settings?tab=integrations&error=Could+not+read+email+address')
    }

    // Calculate token expiry timestamp
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Upsert into email_integrations (one per org + provider)
    const supabase = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('email_integrations').upsert(
      {
        organization_id: ORG_ID,
        provider: 'outlook',
        email_address: profile.mail,
        display_name: profile.displayName ?? profile.mail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,provider' }
    )

    if (error) {
      console.error('[outlook callback] DB upsert failed:', error)
      return redirect(`/settings?tab=integrations&error=${encodeURIComponent(error.message)}`)
    }

    return redirect('/settings?tab=integrations&connected=1')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[outlook callback]', err)
    return redirect(`/settings?tab=integrations&error=${encodeURIComponent(msg)}`)
  }
}
