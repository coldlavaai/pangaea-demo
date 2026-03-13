/**
 * POST /api/documents/[docId]/re-extract
 *
 * Re-runs Claude Vision extraction on an already-uploaded document.
 * Useful when the original upload extraction failed or happened before
 * extraction fields were added.
 *
 * For photo_id: extracts doc_type, document_number, first_name, last_name,
 *               date_of_birth, expiry_date, nationality → saves to operative
 * For cscs_card: extracts card_colour, card_number, expiry_date, card_type → saves to operative
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  // Auth check: only authenticated users can trigger re-extraction
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { docId } = await params
  const supabase = createServiceClient()

  // Fetch document + operative
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, document_type, file_key, operative_id, operatives!documents_operative_id_fkey(first_name, last_name, cscs_card_type)')
    .eq('id', docId)
    .single()

  if (docErr || !doc || !doc.file_key) {
    return NextResponse.json({ error: 'Document not found or has no stored file' }, { status: 404 })
  }

  if (!['photo_id', 'cscs_card'].includes(doc.document_type)) {
    return NextResponse.json({ error: `Re-extraction not supported for ${doc.document_type}` }, { status: 400 })
  }

  // Download file from Supabase Storage
  const { data: fileData, error: downloadErr } = await supabase.storage
    .from('operative-documents')
    .download(doc.file_key)

  if (downloadErr || !fileData) {
    return NextResponse.json({ error: 'Failed to download document file from storage' }, { status: 500 })
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const base64 = buffer.toString('base64')
  // Infer media type from file key extension
  const ext = doc.file_key.split('.').pop()?.toLowerCase() ?? 'jpg'
  const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

  const operative = doc.operatives as { first_name: string; last_name: string; cscs_card_type: string | null } | null
  const operativeId = doc.operative_id as string

  // ── Photo ID extraction ─────────────────────────────────────────────────────
  if (doc.document_type === 'photo_id') {
    const prompt = `This is a UK passport or UK driving licence.
Extract all data from this document.

Respond with JSON only (no markdown):
{
  "doc_type": "passport" | "driving_licence" | "other",
  "document_number": "passport number or driving licence number exactly as printed, or null",
  "first_name": "all given names exactly as printed, or null",
  "last_name": "surname exactly as printed, or null",
  "date_of_birth": "YYYY-MM-DD or null",
  "expiry_date": "YYYY-MM-DD or null",
  "nationality": "nationality exactly as printed on document, or null"
}`

    let parsed: Record<string, string | null>
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } },
            { type: 'text', text: prompt },
          ],
        }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const clean = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      parsed = JSON.parse(clean)
    } catch (e) {
      console.error('[re-extract] ID vision error', e)
      return NextResponse.json({ error: 'Vision extraction failed' }, { status: 500 })
    }

    // Build operative update
    const updates: Record<string, string | null> = {}
    if (parsed.date_of_birth)   updates.date_of_birth       = parsed.date_of_birth
    if (parsed.expiry_date)     updates.id_expiry            = parsed.expiry_date
    if (parsed.nationality)     updates.nationality          = parsed.nationality
    if (parsed.document_number) updates.id_document_number   = parsed.document_number

    // Derive RTW type from nationality
    const n = (parsed.nationality ?? '').toLowerCase()
    let rtwType: string | null = null
    if (n.includes('british') || n.includes('united kingdom') || n === 'gbr') rtwType = 'british_citizen'
    else if (n.includes('irish') || n.includes('ireland') || n === 'irl') rtwType = 'irish_citizen'
    else if (parsed.doc_type === 'driving_licence') rtwType = 'driving_licence'
    else if (parsed.doc_type === 'passport') rtwType = 'passport'
    if (rtwType) updates.rtw_type = rtwType

    // Also update document expiry_date in the documents table
    await supabase.from('documents').update({ expiry_date: parsed.expiry_date ?? null }).eq('id', docId)

    await supabase.from('operatives').update(updates).eq('id', operativeId)

    return NextResponse.json({ ok: true, extracted: { ...parsed, rtw_type: rtwType } })
  }

  // ── CSCS card extraction ────────────────────────────────────────────────────
  if (doc.document_type === 'cscs_card') {
    const prompt = `This is a CSCS card (Construction Skills Certification Scheme, UK construction).
Extract all data from this card.

Respond with JSON only (no markdown):
{
  "card_colour": "green" | "blue" | "gold" | "black" | "red" | "white" | null,
  "card_number": "card number as printed or null",
  "expiry_date": "YYYY-MM-DD or null",
  "card_type": "occupation/card title e.g. Skilled Worker, Labourer, Supervisor or null",
  "card_description": "full description text on the card if present or null"
}`

    let parsed: Record<string, string | null>
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } },
            { type: 'text', text: prompt },
          ],
        }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const clean = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      parsed = JSON.parse(clean)
    } catch (e) {
      console.error('[re-extract] CSCS vision error', e)
      return NextResponse.json({ error: 'Vision extraction failed' }, { status: 500 })
    }

    const updates: Record<string, string | null> = {}
    if (parsed.card_colour)      updates.cscs_card_type        = parsed.card_colour
    if (parsed.card_number)      updates.cscs_card_number      = parsed.card_number
    if (parsed.expiry_date)      updates.cscs_expiry           = parsed.expiry_date
    if (parsed.card_type)        updates.cscs_card_title       = parsed.card_type
    if (parsed.card_description) updates.cscs_card_description = parsed.card_description

    await supabase.from('documents').update({ expiry_date: parsed.expiry_date ?? null }).eq('id', docId)
    await supabase.from('operatives').update(updates).eq('id', operativeId)

    return NextResponse.json({ ok: true, extracted: parsed })
  }
}
