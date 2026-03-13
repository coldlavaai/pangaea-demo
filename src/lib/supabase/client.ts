'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// createClient() — for Client Components (browser, uses user session/cookies)
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
