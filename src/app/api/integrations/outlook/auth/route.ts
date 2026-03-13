import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserRole } from '@/lib/auth/get-user-role'
import { getAuthUrl } from '@/lib/email/outlook-auth'

// Generates a random CSRF state token and redirects to Microsoft login.
export async function GET(_req: NextRequest) {
  const role = await getUserRole()
  if (role !== 'admin' && role !== 'super_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const state = crypto.randomUUID()

  // Store state in a short-lived cookie to verify on callback
  const cookieStore = await cookies()
  cookieStore.set('outlook_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 minutes
    path: '/',
    sameSite: 'lax',
  })

  try {
    const authUrl = getAuthUrl(state)
    return NextResponse.redirect(authUrl)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth config error'
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=${encodeURIComponent(msg)}`
    )
  }
}
