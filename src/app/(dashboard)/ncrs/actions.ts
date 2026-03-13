'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

export async function deleteNcr(ncrId: string): Promise<{ error?: string }> {
  const role = await getUserRole()
  if (role !== 'admin' && role !== 'super_admin' && role !== 'staff') return { error: 'Unauthorized' }
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('non_conformance_incidents')
    .delete()
    .eq('id', ncrId)
    .eq('organization_id', ORG_ID)
  if (error) return { error: error.message }
  revalidatePath('/ncrs')
  return {}
}

export async function updateNcr(
  ncrId: string,
  data: {
    description?: string
    incident_type?: string
    severity?: string
    incident_date?: string
    incident_time?: string | null
  }
): Promise<{ error?: string }> {
  const role = await getUserRole()
  if (role !== 'admin' && role !== 'super_admin' && role !== 'staff') return { error: 'Unauthorized' }
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('non_conformance_incidents')
    .update(data as Record<string, unknown>)
    .eq('id', ncrId)
    .eq('organization_id', ORG_ID)
  if (error) return { error: error.message }
  revalidatePath(`/ncrs/${ncrId}`)
  return {}
}

export async function addNcrComment(
  ncrId: string,
  comment: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const svcSupabase = createServiceClient()

  // Get user display name
  const { data: dbUser } = await svcSupabase
    .from('users')
    .select('first_name, last_name, id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const authorName = dbUser ? `${dbUser.first_name} ${dbUser.last_name}` : 'Unknown'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (svcSupabase as any).from('ncr_comments').insert({
    organization_id: ORG_ID,
    ncr_id: ncrId,
    user_id: dbUser?.id ?? null,
    author_name: authorName,
    comment: comment.trim(),
  })
  if (error) return { error: error.message }
  revalidatePath(`/ncrs/${ncrId}`)
  return {}
}
