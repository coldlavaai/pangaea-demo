import { cache } from 'react'
import { jwtDecode } from 'jwt-decode'
import { createClient } from '@/lib/supabase/server'
import type { UserRole, SupabaseJWT } from './types'

/**
 * Returns the current user's role from the JWT claim injected by the
 * custom_access_token_hook Postgres function.
 *
 * Wrapped in React cache() so multiple server components in the same
 * render tree only decode the JWT once.
 *
 * Returns null if not authenticated.
 */
export const getUserRole = cache(async (): Promise<UserRole | null> => {
  const supabase = await createClient()

  // getUser() verifies auth — required for security
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // getSession() reads JWT claims (already validated above)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null

  try {
    const jwt = jwtDecode<SupabaseJWT>(session.access_token)
    return jwt.user_role ?? 'staff'
  } catch {
    return 'staff'
  }
})
