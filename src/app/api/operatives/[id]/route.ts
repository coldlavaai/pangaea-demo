import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications/create'

// Fields allowed for inline PATCH updates (prevents arbitrary column writes)
const PATCHABLE_FIELDS = new Set([
  // Contact
  'phone', 'email',
  // Address
  'address_line1', 'address_line2', 'city', 'county', 'postcode',
  // Identity
  'date_of_birth', 'nationality', 'ni_number', 'gender', 'preferred_language',
  // Work Details
  'labour_type', 'grade', 'day_rate', 'charge_rate', 'hourly_rate',
  'start_date', 'experience_years', 'source', 'engagement_method',
  'agency_name', 'trading_name', 'machine_operator', 'min_acceptable_rate',
  // Right to Work
  'rtw_type', 'rtw_verified', 'rtw_expiry', 'rtw_share_code', 'gov_rtw_checked',
  // CSCS
  'cscs_card_type', 'cscs_card_number', 'cscs_expiry', 'cscs_card_title', 'cscs_card_description',
  // Next of Kin
  'next_of_kin_name', 'next_of_kin_phone',
  // Compliance
  'wtd_opt_out', 'medical_notes', 'other_certifications', 'caution_reason', 'notes',
  // Payroll
  'bank_sort_code', 'bank_account_number', 'utr_number',
  // Status
  'status',
])

// Roles that can inline-edit operative fields
const EDIT_ROLES = new Set(['super_admin', 'admin', 'director', 'labour_manager'])

/**
 * PATCH /api/operatives/[id] — inline field update
 * Body: { field: string, value: string | number | boolean | null }
 * Requires: super_admin, admin, director, or labour_manager role
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  // Auth + role check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  let userRole = 'staff'
  if (session?.access_token) {
    try {
      const jwt = JSON.parse(atob(session.access_token.split('.')[1]))
      userRole = jwt.user_role ?? 'staff'
    } catch { /* default to staff */ }
  }

  if (!EDIT_ROLES.has(userRole)) {
    return NextResponse.json({ error: 'You do not have permission to edit operative data' }, { status: 403 })
  }

  const body = await req.json()
  const { field, value } = body as { field: string; value: unknown }

  if (!field || !PATCHABLE_FIELDS.has(field)) {
    return NextResponse.json({ error: `Field '${field}' is not editable` }, { status: 400 })
  }

  const svc = createServiceClient()

  // Fetch current value for audit log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: before } = await (svc as any).from('operatives')
    .select(`first_name, last_name, ${field}`)
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!before) {
    return NextResponse.json({ error: 'Operative not found' }, { status: 404 })
  }

  // Update
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (svc as any).from('operatives')
    .update({ [field]: value ?? null })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) {
    console.error('[patch-operative]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit notification (non-blocking)
  const name = `${before.first_name} ${before.last_name}`.trim()
  const oldVal = before[field]
  const label = field.replace(/_/g, ' ')
  createNotification(svc, {
    type: 'info' as 'arrive', // reuse existing type — low-noise audit entry
    title: `${name} — ${label} updated`,
    body: `${label}: ${oldVal ?? '(empty)'} → ${value ?? '(empty)'}`,
    severity: 'info',
    operative_id: id,
    link_url: `/operatives/${id}`,
    push: false,
  }).catch(() => {}) // non-fatal

  return NextResponse.json({ success: true, field, value })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  // Auth + role check: only admin and staff can delete operatives
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  let userRole = 'staff'
  if (session?.access_token) {
    try {
      const jwt = JSON.parse(atob(session.access_token.split('.')[1]))
      userRole = jwt.user_role ?? 'staff'
    } catch { /* default to staff */ }
  }
  if (!['admin', 'super_admin', 'staff'].includes(userRole)) {
    return NextResponse.json({ error: 'Insufficient permissions — only admin and staff can delete operatives' }, { status: 403 })
  }

  // Use service client to handle all cascading deletes
  const svc = createServiceClient()

  // 1. Unlink from message_threads + messages (keep thread/message history, just unlink)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (svc.from('message_threads') as any)
    .update({ operative_id: null })
    .eq('operative_id', id)
    .eq('organization_id', orgId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (svc.from('messages') as any)
    .update({ operative_id: null })
    .eq('operative_id', id)
    .eq('organization_id', orgId)

  // 2. Delete records that belong solely to this operative
  await svc.from('operative_cards').delete().eq('operative_id', id)
  await svc.from('performance_reviews').delete().eq('operative_id', id)
  await svc.from('documents').delete().eq('operative_id', id)

  // 3. Unlink allocations (keep for audit trail — just unlink)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (svc.from('allocations') as any)
    .update({ operative_id: null })
    .eq('operative_id', id)
    .eq('organization_id', orgId)

  // 4. Fetch name before deleting (for activity log)
  const { data: operative } = await svc.from('operatives')
    .select('first_name, last_name')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  // 5. Delete the operative
  const { error } = await svc.from('operatives')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) {
    console.error('[delete-operative]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 6. Log to activity feed
  const name = operative ? `${operative.first_name} ${operative.last_name}`.trim() : 'Unknown operative'
  await createNotification(svc, {
    type: 'operative_deleted',
    title: `Operative deleted — ${name}`,
    body: `${name} (ID: ${id}) was permanently removed from the system.`,
    severity: 'warning',
    link_url: '/operatives',
    push: false,
  })

  return NextResponse.json({ success: true })
}
