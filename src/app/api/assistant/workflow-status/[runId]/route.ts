import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data: run } = await db
    .from('workflow_runs')
    .select('id, workflow_type, status, total_targets, targets_contacted, targets_completed, targets_failed, created_at')
    .eq('id', runId)
    .single()

  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: targets } = await db
    .from('workflow_targets')
    .select('id, operative_id, status, outcome, data, messages_sent, operative:operatives!workflow_targets_operative_id_fkey(first_name, last_name)')
    .eq('workflow_run_id', runId)

  // Build per-item checklist from target data
  const checklist: { key: string; label: string; type: 'data' | 'document'; done: boolean }[] = []

  for (const target of targets ?? []) {
    const dataFields = (target.data?.data_fields as string[]) ?? []
    const documentTypes = (target.data?.document_types as string[]) ?? []
    const collectedFields = target.data?.collected_fields ? Object.keys(target.data.collected_fields as Record<string, unknown>) : []
    const uploadedDocs = (target.data?.uploaded_docs as string[]) ?? []
    const dataCollected = !!target.data?.data_collected

    const DATA_LABELS: Record<string, string> = {
      ni_number: 'NI Number', email: 'Email', phone: 'Phone',
      bank_details: 'Bank Details', utr: 'UTR', address: 'Address',
      nok_name: 'Next of Kin Name', nok_phone: 'Next of Kin Phone',
      date_of_birth: 'Date of Birth',
    }
    const DOC_LABELS: Record<string, string> = {
      photo_id: 'Photo ID / Passport', right_to_work: 'Right to Work',
      cscs_card: 'CSCS Card', cpcs_ticket: 'CPCS Ticket',
      first_aid: 'First Aid Certificate',
    }

    for (const f of dataFields) {
      checklist.push({
        key: f,
        label: DATA_LABELS[f] ?? f,
        type: 'data',
        done: dataCollected || collectedFields.includes(f),
      })
    }
    for (const d of documentTypes) {
      checklist.push({
        key: d,
        label: DOC_LABELS[d] ?? d,
        type: 'document',
        done: uploadedDocs.includes(d),
      })
    }
  }

  return NextResponse.json({
    run_id: run.id,
    workflow_type: run.workflow_type,
    status: run.status,
    total_targets: run.total_targets,
    targets_contacted: run.targets_contacted,
    targets_completed: run.targets_completed,
    targets_failed: run.targets_failed,
    created_at: run.created_at,
    checklist,
    targets: (targets ?? []).map((t: { id: string; status: string; outcome: string | null; operative: { first_name: string; last_name: string } | null }) => ({
      id: t.id,
      status: t.status,
      outcome: t.outcome,
      operative: t.operative,
    })),
  })
}
