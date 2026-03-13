/**
 * Email template system — server-side only.
 * Fetches from `email_templates` table, falls back to hardcoded defaults.
 *
 * For client-safe types and definitions, import from './template-defs'.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { TEMPLATE_DEFINITIONS, renderTemplate } from './template-defs'

export type { TemplateVariable, TemplateDefinition } from './template-defs'
export { TEMPLATE_DEFINITIONS, renderTemplate }

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

// ─── DB fetch + fallback ──────────────────────────────────────────────────────

export interface EmailTemplate {
  subject: string
  body_html: string
}

export async function getTemplate(key: string): Promise<EmailTemplate> {
  try {
    const supabase = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('email_templates')
      .select('subject, body_html')
      .eq('organization_id', ORG_ID)
      .eq('template_key', key)
      .maybeSingle() as { data: EmailTemplate | null }

    if (data?.subject && data?.body_html) return data
  } catch {
    // fall through to default
  }

  const def = TEMPLATE_DEFINITIONS.find(t => t.key === key)
  return {
    subject: def?.defaultSubject ?? '',
    body_html: def?.defaultBodyHtml ?? '',
  }
}
