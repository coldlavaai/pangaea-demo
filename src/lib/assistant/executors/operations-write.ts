import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeOperationsWrite(input: any): Promise<ToolResult> {
  if (!input.confirmed) return { text_result: 'CONFIRMATION_REQUIRED', rich_result: null }

  const supabase = await createClient()

  switch (input.action) {
    case 'terminate_allocation': {
      if (!input.id) return { text_result: 'id required' }
      const { error } = await supabase
        .from('allocations')
        .update({ status: 'terminated' })
        .eq('id', input.id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error terminating allocation: ${error.message}` }
      return { text_result: 'Allocation terminated.' }
    }

    case 'approve_timesheet': {
      if (!input.id) return { text_result: 'id required' }
      const { error } = await supabase
        .from('timesheets')
        .update({ status: 'approved' })
        .eq('id', input.id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error approving timesheet: ${error.message}` }
      return { text_result: 'Timesheet approved.' }
    }

    case 'reject_timesheet': {
      if (!input.id) return { text_result: 'id required' }
      const { error } = await supabase
        .from('timesheets')
        .update({ status: 'rejected' })
        .eq('id', input.id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error rejecting timesheet: ${error.message}` }
      return { text_result: 'Timesheet rejected.' }
    }

    case 'verify_document': {
      if (!input.id) return { text_result: 'id required' }
      const { error } = await supabase
        .from('documents')
        .update({ status: 'verified', verified_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error verifying document: ${error.message}` }
      return { text_result: 'Document verified.' }
    }

    case 'reject_document': {
      if (!input.id) return { text_result: 'id required' }
      const { error } = await supabase
        .from('documents')
        .update({ status: 'rejected' })
        .eq('id', input.id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error rejecting document: ${error.message}` }
      return { text_result: 'Document rejected.' }
    }

    default:
      return { text_result: `Action ${input.action} not yet implemented.` }
  }
}
