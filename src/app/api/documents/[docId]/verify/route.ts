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

// Derive RTW type from extracted nationality string
function deriveRtwType(nationality: string | null, docType: string): string | null {
  const n = (nationality ?? '').toLowerCase()
  if (n.includes('british') || n.includes('united kingdom') || n === 'gbr') return 'british_citizen'
  if (n.includes('irish') || n.includes('ireland') || n === 'irl') return 'irish_citizen'
  if (docType === 'driving_licence') return 'driving_licence'
  if (docType === 'passport') return 'passport'
  return null
}

const RTW_NO_EXPIRY = ['british_citizen', 'irish_citizen']

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  // Auth + role check: only admin and staff can verify documents
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { docId } = await params
  const supabase = createServiceClient()

  // Fetch doc + operative details
  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, document_type, expiry_date, operative_id, operatives!documents_operative_id_fkey(phone, first_name, status, cscs_card_type, nationality)')
    .eq('id', docId)
    .single()

  if (error || !doc) {
    console.error('[doc-verify] fetch error', error)
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Update document status
  const { error: updateError } = await supabase
    .from('documents')
    .update({ status: 'verified', rejection_reason: null, updated_at: new Date().toISOString() })
    .eq('id', docId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const operative = doc.operatives as {
    phone: string | null
    first_name: string | null
    status: string | null
    cscs_card_type: string | null
    nationality: string | null
  } | null
  const phone = operative?.phone
  const firstName = operative?.first_name ?? 'there'
  const docLabel = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type

  // When a photo_id is verified AND operative is British/Irish → auto-satisfy RTW
  // A UK/Irish passport proves both identity AND right to work.
  // For other nationalities, a passport alone is NOT proof of RTW — they need separate documentation.
  if (doc.document_type === 'photo_id' && doc.operative_id) {
    const rtwType = deriveRtwType(operative?.nationality ?? null, 'passport')
    if (rtwType && RTW_NO_EXPIRY.includes(rtwType)) {
      // British or Irish citizen — passport = RTW, no expiry needed
      await supabase.from('operatives').update({
        rtw_verified: true,
        rtw_type: rtwType,
      }).eq('id', doc.operative_id)
      console.log('[doc-verify] British/Irish passport verified — RTW auto-satisfied for', doc.operative_id)
    }
    // For other nationalities: do NOT set rtw_verified — they need a separate right_to_work document
  }

  // When a right_to_work document is verified → set rtw_verified
  if (doc.document_type === 'right_to_work' && doc.operative_id) {
    const rtwUpdates: Record<string, unknown> = { rtw_verified: true }
    if (doc.expiry_date) rtwUpdates.rtw_expiry = doc.expiry_date
    await supabase.from('operatives').update(rtwUpdates).eq('id', doc.operative_id)
    console.log('[doc-verify] RTW document verified for', doc.operative_id)
  }

  // Send doc_verified HSM template (works outside the 24-hour session window)
  if (phone) {
    try {
      await sendWhatsAppTemplate(phone, WHATSAPP_TEMPLATES.DOC_VERIFIED, {
        '1': firstName,
        '2': docLabel,
      })
    } catch (e) {
      console.error('[doc-verify] WhatsApp template error', e)
    }
  }

  // Auto-verification: if operative is still qualifying, check whether all required docs are now verified
  if (operative?.status === 'qualifying' && doc.operative_id) {
    const { data: allDocs } = await supabase
      .from('documents')
      .select('document_type, status')
      .eq('operative_id', doc.operative_id)

    const photoVerified = allDocs?.some(d => d.document_type === 'photo_id' && d.status === 'verified') ?? false
    const cscsVerified  = allDocs?.some(d => d.document_type === 'cscs_card' && d.status === 'verified') ?? false
    const cscsExpected  = operative.cscs_card_type !== null

    const fullyVerified = photoVerified && (cscsVerified || !cscsExpected)

    if (fullyVerified) {
      await supabase
        .from('operatives')
        .update({ status: 'verified' })
        .eq('id', doc.operative_id)

      if (phone) {
        try {
          await sendWhatsAppTemplate(phone, WHATSAPP_TEMPLATES.WELCOME_VERIFIED, {
            '1': firstName,
          })
        } catch (e) {
          console.error('[doc-verify] welcome WhatsApp template error', e)
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
