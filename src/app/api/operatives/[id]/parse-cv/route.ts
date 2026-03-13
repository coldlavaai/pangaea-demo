/**
 * POST /api/operatives/[id]/parse-cv
 *
 * Called immediately after a CV document is uploaded.
 * Downloads the file from Supabase storage, sends to Claude,
 * extracts structured work history + summary, and writes it to the DB.
 *
 * Body: { documentId: string }
 * Returns: { ok: true, roles_extracted: number, summary_saved: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { createServiceClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

const CV_PARSE_PROMPT = `This is a CV (curriculum vitae) or resume for a construction / labour industry worker.

Extract the following as JSON only (no markdown, no explanation):
{
  "summary": "2-3 sentence professional summary of the person's background and key skills",
  "roles": [
    {
      "job_title": "exact job title from CV",
      "employer": "company/employer name or null",
      "start_date": "YYYY-MM or YYYY or null",
      "end_date": "YYYY-MM or YYYY or null (use null if 'present' / 'current')",
      "description": "brief description of responsibilities, max 150 chars, or null"
    }
  ]
}

Rules:
- Include all roles, most recent first
- Do not go back more than 15 years unless highly relevant
- If no clear roles found, return "roles": []
- Dates: prefer YYYY-MM format, fall back to YYYY if only year given
- Keep descriptions concise and relevant to construction/labour skills
- If the document is not a CV, return { "summary": null, "roles": [] }`

async function parseCV(buffer: Buffer, mediaType: string) {
  const base64 = buffer.toString('base64')

  let contentBlock: ContentBlockParam
  if (mediaType === 'application/pdf') {
    contentBlock = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    } as ContentBlockParam
  } else {
    contentBlock = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
        data: base64,
      },
    } as ContentBlockParam
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [contentBlock, { type: 'text', text: CV_PARSE_PROMPT }],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const clean = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(clean) as {
    summary: string | null
    roles: Array<{
      job_title: string
      employer: string | null
      start_date: string | null
      end_date: string | null
      description: string | null
    }>
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: operativeId } = await params
  const supabase = createServiceClient()

  const body = await req.json().catch(() => ({}))
  const { documentId } = body as { documentId?: string }

  if (!documentId) {
    return NextResponse.json({ ok: false, error: 'documentId required' }, { status: 400 })
  }

  // Fetch document record
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, file_key, file_name')
    .eq('id', documentId)
    .eq('operative_id', operativeId)
    .eq('organization_id', ORG_ID)
    .single()

  if (docErr || !doc?.file_key) {
    return NextResponse.json({ ok: false, error: 'Document not found' }, { status: 404 })
  }

  // Download from Supabase storage
  const { data: fileData, error: dlErr } = await supabase.storage
    .from('operative-documents')
    .download(doc.file_key)

  if (dlErr || !fileData) {
    return NextResponse.json({ ok: false, error: `Download failed: ${dlErr?.message}` }, { status: 500 })
  }

  // Determine media type from file extension
  const ext = (doc.file_name ?? doc.file_key).split('.').pop()?.toLowerCase() ?? ''
  const mediaType =
    ext === 'pdf' ? 'application/pdf' :
    ext === 'png' ? 'image/png' :
    ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
    ext === 'webp' ? 'image/webp' :
    'application/pdf' // default

  const buffer = Buffer.from(await fileData.arrayBuffer())

  // Parse with Claude
  let parsed: Awaited<ReturnType<typeof parseCV>>
  try {
    parsed = await parseCV(buffer, mediaType)
  } catch (e) {
    console.error('[parse-cv] Claude error:', e)
    return NextResponse.json({ ok: false, error: 'CV parsing failed' }, { status: 500 })
  }

  const result = { roles_extracted: 0, summary_saved: false }

  // Insert work history rows (clear any previous cv_parsed entries first)
  await supabase
    .from('work_history')
    .delete()
    .eq('operative_id', operativeId)
    .eq('organization_id', ORG_ID)
    .eq('source', 'cv_parsed')

  if (parsed.roles && parsed.roles.length > 0) {
    const rows = parsed.roles.map((role) => ({
      organization_id: ORG_ID,
      operative_id: operativeId,
      job_title: role.job_title,
      employer: role.employer ?? null,
      start_date: role.start_date ?? null,
      end_date: role.end_date ?? null,
      description: role.description ?? null,
      source: 'cv_parsed' as const,
    }))

    const { error: insertErr } = await supabase.from('work_history').insert(rows)
    if (!insertErr) result.roles_extracted = rows.length
  }

  // Update operative cv_summary
  if (parsed.summary) {
    const { error: updateErr } = await supabase
      .from('operatives')
      .update({ cv_summary: parsed.summary })
      .eq('id', operativeId)
      .eq('organization_id', ORG_ID)

    if (!updateErr) result.summary_saved = true
  }

  return NextResponse.json({ ok: true, ...result })
}
