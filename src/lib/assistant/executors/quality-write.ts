import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeQualityWrite(input: any): Promise<ToolResult> {
  if (!input.confirmed) return { text_result: 'CONFIRMATION_REQUIRED', rich_result: null }

  const supabase = await createClient()

  switch (input.action) {
    case 'create_ncr': {
      const { data, error } = await supabase
        .from('non_conformance_incidents')
        .insert({ ...input.data, organization_id: ORG_ID, resolved: false })
        .select()
        .single()
      if (error) return { text_result: `Error creating NCR: ${error.message}` }
      return { text_result: `NCR created (ID: ${data.id}).`, rich_result: { type: 'deep_link', data: { href: `/ncrs/${data.id}`, label: 'View NCR' } } }
    }

    case 'update_ncr': {
      if (!input.id) return { text_result: 'id required' }
      const { error } = await supabase
        .from('non_conformance_incidents')
        .update(input.data)
        .eq('id', input.id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error updating NCR: ${error.message}` }
      return { text_result: 'NCR updated.' }
    }

    case 'add_rap_review': {
      const { data: session } = await supabase.auth.getSession()
      const userId = session.session?.user?.id
      const { error } = await supabase
        .from('performance_reviews')
        .insert({ ...input.data, organization_id: ORG_ID, reviewer_id: userId })
      if (error) return { text_result: `Error adding performance review: ${error.message}` }
      return { text_result: 'Performance review added.' }
    }

    default:
      return { text_result: `Action ${input.action} not implemented.` }
  }
}
