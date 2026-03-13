import type { SupabaseClient } from '@supabase/supabase-js'
import { createShortLink } from '@/lib/whatsapp/shorten'

/**
 * Generate a secure 24-hour upload token for an operative and persist it to the DB.
 * Reusable by both Amber intake and workflow engine.
 */
export async function generateUploadToken(
  supabase: SupabaseClient,
  operativeId: string
): Promise<{ token: string; expiresAt: string }> {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('operatives')
    .update({
      document_upload_token: token,
      document_upload_token_expires_at: expiresAt,
    })
    .eq('id', operativeId)

  if (error) console.error('[upload-link] failed to set token:', error.message)

  return { token, expiresAt }
}

/**
 * Generate an upload token, build the full upload URL, and return a short link.
 * Pass context to encode what's being requested in the URL:
 *   documentType  → ?type=passport                  (single document chase)
 *   dataFields    → ?fields=ni_number,email          (data collection form)
 *   documentTypes → ?docs=photo_id,right_to_work     (combined profile completion)
 */
export async function generateUploadLink(
  supabase: SupabaseClient,
  operativeId: string,
  context?: { documentType?: string; dataFields?: string[]; documentTypes?: string[]; language?: string | null }
): Promise<string> {
  const { token } = await generateUploadToken(supabase, operativeId)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim()
  const params = new URLSearchParams()
  if (context?.documentType) params.set('type', context.documentType)
  if (context?.dataFields?.length) params.set('fields', context.dataFields.join(','))
  if (context?.documentTypes?.length) params.set('docs', context.documentTypes.join(','))
  if (context?.language && context.language !== 'en') params.set('lang', context.language)
  const qs = params.toString()
  const fullUrl = `${appUrl}/apply/${token}${qs ? `?${qs}` : ''}`
  return createShortLink(fullUrl)
}
