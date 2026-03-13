'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserRole } from '@/lib/auth/get-user-role'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

export async function quickAssignAllocation(input: {
  operativeId: string
  siteId: string
  agreedDayRate: number
  startDate: string
}): Promise<{ error?: string }> {
  const role = await getUserRole()
  if (!role || role === 'auditor') return { error: 'Unauthorized' }

  const supabase = createServiceClient()

  // Basic compliance — check operative isn't blocked
  const { data: op } = await supabase
    .from('operatives')
    .select('status, rtw_verified')
    .eq('id', input.operativeId)
    .eq('organization_id', ORG_ID)
    .single()

  if (!op) return { error: 'Operative not found' }
  if (op.status === 'blocked') return { error: 'Operative is blocked and cannot be allocated' }
  if (!op.rtw_verified) return { error: 'Right to work not verified — allocation blocked' }

  const { error } = await supabase.from('allocations').insert({
    organization_id: ORG_ID,
    operative_id: input.operativeId,
    site_id: input.siteId,
    labour_request_id: null,
    start_date: input.startDate,
    agreed_day_rate: input.agreedDayRate,
    status: 'pending',
  })

  if (error) return { error: error.message }

  revalidatePath(`/operatives/${input.operativeId}`)
  return {}
}

export async function terminateAllocation(allocationId: string): Promise<{ error?: string }> {
  const role = await getUserRole()
  if (!role || role === 'auditor') return { error: 'Unauthorized' }

  const supabase = createServiceClient()

  const { data: alloc } = await supabase
    .from('allocations')
    .select('operative_id')
    .eq('id', allocationId)
    .eq('organization_id', ORG_ID)
    .single()

  if (!alloc) return { error: 'Allocation not found' }

  const { error } = await supabase
    .from('allocations')
    .update({ status: 'terminated', end_date: new Date().toISOString().split('T')[0] })
    .eq('id', allocationId)
    .eq('organization_id', ORG_ID)

  if (error) return { error: error.message }

  revalidatePath(`/operatives/${alloc.operative_id}`)
  return {}
}
