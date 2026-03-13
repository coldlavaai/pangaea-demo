import { createServiceClient } from '@/lib/supabase/server'

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim()

/**
 * Creates a short link in Supabase and returns the full short URL.
 * Falls back to the original URL if the insert fails.
 * No external dependencies — zero SLA risk.
 */
export async function createShortLink(targetUrl: string): Promise<string> {
  try {
    const supabase = createServiceClient()
    const code = generateCode()

    const { error } = await supabase
      .from('short_links')
      .insert({ code, target_url: targetUrl })

    if (error) {
      console.error('[shorten] insert failed, using full URL:', error.message)
      return targetUrl
    }

    return `${BASE_URL}/r/${code}`
  } catch (e) {
    console.error('[shorten] unexpected error, using full URL:', e)
    return targetUrl
  }
}

/** Generates a random 8-character alphanumeric code. */
function generateCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
