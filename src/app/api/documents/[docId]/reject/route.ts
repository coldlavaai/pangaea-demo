import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppTemplate, WHATSAPP_TEMPLATES } from '@/lib/whatsapp/templates'

const DOC_TYPE_LABELS: Record<string, string> = {
  photo_id: 'passport / driving licence',
  cscs_card: 'CSCS card',
  right_to_work: 'right to work document',
  cpcs_ticket: 'CPCS ticket',
  npors_ticket: 'NPORS ticket',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  // Auth + role check: only admin and staff can reject documents
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { docId } = await params
  const { reason } = await req.json() as { reason: string }

  if (!reason?.trim()) {
    return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch doc + operative phone
  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, document_type, operative_id, operatives!documents_operative_id_fkey(phone, first_name)')
    .eq('id', docId)
    .single()

  if (error || !doc) {
    console.error('[doc-reject] fetch error', error)
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Update status
  const { error: updateError } = await supabase
    .from('documents')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', docId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Send doc_rejected HSM template (works outside the 24-hour session window)
  const operative = doc.operatives as { phone: string | null; first_name: string | null } | null
  const phone = operative?.phone
  const firstName = operative?.first_name ?? 'there'
  const docLabel = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type

  if (phone) {
    try {
      await sendWhatsAppTemplate(phone, WHATSAPP_TEMPLATES.DOC_REJECTED, {
        '1': firstName,
        '2': docLabel,
        '3': reason,
      })
    } catch (e) {
      console.error('[doc-reject] WhatsApp template error', e)
    }
  }

  return NextResponse.json({ ok: true })
}
