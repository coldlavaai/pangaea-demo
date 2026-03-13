import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

export async function POST() {
  const role = await getUserRole()
  if (role !== 'admin' && role !== 'super_admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('email_integrations')
    .delete()
    .eq('organization_id', ORG_ID)
    .eq('provider', 'outlook')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
