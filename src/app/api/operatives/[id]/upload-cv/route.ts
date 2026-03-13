/**
 * POST /api/operatives/[id]/upload-cv
 *
 * Accepts a multipart/form-data upload with a `file` field (PDF).
 * 1. Stores the file in Supabase Storage (operative-documents bucket)
 * 2. Creates a document record with document_type = 'cv'
 * 3. Parses the CV with Claude to extract work history + summary
 * 4. Inserts work_history rows (source = 'cv_parsed')
 * 5. Updates operative.cv_summary
 *
 * Supports PDF only. Word docs: convert to PDF before uploading.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic, { toFile } from '@anthropic-ai/sdk'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { createServiceClient } from '@/lib/supabase/server'

void toFile // imported for side-effects only (avoids unused-import lint)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

interface ParsedWorkEntry {
  job_title: string
  employer: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
}

interface ParsedCV {
  summary: string | null
  work_history: ParsedWorkEntry[]
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: operativeId } = await params
  const supabase = createServiceClient()

  // ── Verify operative exists ────────────────────────────────────────────────
  const { data: operative, error: opErr } = await supabase
    .from('operatives')
    .select('id, first_name, last_name')
    .eq('id', operativeId)
    .eq('organization_id', ORG_ID)
    .single()

  if (opErr || !operative) {
    return NextResponse.json({ error: 'Operative not found' }, { status: 404 })
  }

  // ── Parse multipart form ───────────────────────────────────────────────────
  let file: File | null = null
  try {
    const form = await req.formData()
    const raw = form.get('file')
    if (raw instanceof File) file = raw
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    return NextResponse.json({ error: 'Only PDF files are supported. Please convert Word documents to PDF first.' }, { status: 422 })
  }

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const storageKey = `${ORG_ID}/${operativeId}/${Date.now()}-cv.pdf`

  const { error: storageErr } = await supabase.storage
    .from('operative-documents')
    .upload(storageKey, buffer, { contentType: 'application/pdf', upsert: false })

  if (storageErr) {
    return NextResponse.json({ error: `Storage upload failed: ${storageErr.message}` }, { status: 500 })
  }

  // Generate signed URL (7 days) — bucket is private, getPublicUrl won't work
  const { data: urlData } = await supabase.storage.from('operative-documents').createSignedUrl(storageKey, 7 * 24 * 60 * 60)

  // ── Create document record ────────────────────────────────────────────────
  const { data: docRecord, error: docErr } = await supabase
    .from('documents')
    .insert({
      organization_id: ORG_ID,
      operative_id: operativeId,
      document_type: 'cv',
      file_key: storageKey,
      file_url: urlData?.signedUrl ?? '',
      file_name: file.name,
      status: 'verified', // CVs don't need manual verification
    })
    .select('id')
    .single()

  if (docErr || !docRecord) {
    return NextResponse.json({ error: `Document record failed: ${docErr?.message}` }, { status: 500 })
  }

  // ── Parse CV with Claude ───────────────────────────────────────────────────
  const base64 = buffer.toString('base64')

  const prompt = `This is a CV/resume for a construction or landscape industry worker.

Extract the work history and write a professional summary.

Respond with JSON only (no markdown, no explanation):
{
  "summary": "2-3 sentence professional summary in third person describing this person's experience and skills. e.g. 'Experienced groundworker with 8 years in civil engineering...'",
  "work_history": [
    {
      "job_title": "exact job title",
      "employer": "company name or null if not stated",
      "start_date": "YYYY-MM-DD (use first of month if only month/year given, e.g. March 2020 → 2020-03-01) or null",
      "end_date": "YYYY-MM-DD or null if current role",
      "description": "1-2 sentence summary of responsibilities, or null"
    }
  ]
}

Return roles newest first. Include up to 10 roles. If a field is genuinely absent, use null.`

  let parsed: ParsedCV
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          } as ContentBlockParam,
          { type: 'text', text: prompt },
        ],
      }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    parsed = JSON.parse(clean) as ParsedCV
  } catch (e) {
    console.error('[upload-cv] Claude parse error', e)
    // Don't fail the whole upload — store doc, return empty parse
    return NextResponse.json({
      ok: true,
      documentId: docRecord.id,
      summary: null,
      work_history: [],
      warning: 'CV stored but parsing failed. You can add work history manually.',
    })
  }

  // ── Delete previous cv_parsed work history entries ────────────────────────
  await supabase
    .from('work_history')
    .delete()
    .eq('operative_id', operativeId)
    .eq('organization_id', ORG_ID)
    .eq('source', 'cv_parsed')

  // ── Insert new work history rows ──────────────────────────────────────────
  const entries = (parsed.work_history ?? []).slice(0, 10)
  if (entries.length > 0) {
    await supabase.from('work_history').insert(
      entries.map((entry) => ({
        organization_id: ORG_ID,
        operative_id: operativeId,
        job_title: entry.job_title,
        employer: entry.employer ?? null,
        start_date: entry.start_date ?? null,
        end_date: entry.end_date ?? null,
        description: entry.description ?? null,
        source: 'cv_parsed' as const,
      }))
    )
  }

  // ── Update operative cv_summary ───────────────────────────────────────────
  if (parsed.summary) {
    await supabase
      .from('operatives')
      .update({ cv_summary: parsed.summary })
      .eq('id', operativeId)
  }

  return NextResponse.json({
    ok: true,
    documentId: docRecord.id,
    summary: parsed.summary ?? null,
    work_history: entries,
  })
}
