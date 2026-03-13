import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/documents/[docId] — fetch document details + signed preview URL
 * Used by the global review dialog to show the document for verification.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { docId } = await params
  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: doc, error } = await (supabase as any)
    .from('documents')
    .select('id, document_type, file_name, file_key, status, expiry_date, notes, ai_extracted_data, created_at, operative_id, operatives!documents_operative_id_fkey(first_name, last_name, reference_number)')
    .eq('id', docId)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Generate a 1-hour signed URL for the file
  let previewUrl: string | null = null
  if (doc.file_key) {
    const { data: urlData } = await supabase.storage
      .from('operative-documents')
      .createSignedUrl(doc.file_key as string, 3600) // 1 hour
    previewUrl = urlData?.signedUrl ?? null
  }

  const op = doc.operatives ?? doc.operative
  return NextResponse.json({
    id: doc.id,
    document_type: doc.document_type,
    file_name: doc.file_name,
    status: doc.status,
    expiry_date: doc.expiry_date,
    notes: doc.notes,
    ai_extracted_data: doc.ai_extracted_data,
    created_at: doc.created_at,
    operative_id: doc.operative_id,
    preview_url: previewUrl,
    operative_name: op ? `${op.first_name} ${op.last_name}` : null,
    operative_ref: op?.reference_number ?? null,
  })
}
