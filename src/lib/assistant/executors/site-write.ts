import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeSiteWrite(input: any): Promise<ToolResult> {
  if (!input.confirmed) return { text_result: 'CONFIRMATION_REQUIRED', rich_result: null }

  const supabase = await createClient()

  switch (input.action) {
    case 'create': {
      const { data, error } = await supabase
        .from('sites')
        .insert({ ...input.data, organization_id: ORG_ID })
        .select()
        .single()
      if (error) return { text_result: `Error creating site: ${error.message}` }
      return { text_result: `Site "${data.name}" created successfully.`, rich_result: { type: 'deep_link', data: { href: `/sites/${data.id}`, label: `View ${data.name}` } } }
    }

    case 'update': {
      if (!input.site_id) return { text_result: 'site_id required' }
      const { error } = await supabase
        .from('sites')
        .update(input.data)
        .eq('id', input.site_id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error updating site: ${error.message}` }
      return { text_result: 'Site updated successfully.' }
    }

    default:
      return { text_result: `Action ${input.action} not implemented.` }
  }
}
