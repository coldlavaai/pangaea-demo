import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeOperativeWrite(input: any): Promise<ToolResult> {
  // All write actions require confirmation
  if (!input.confirmed) {
    return {
      text_result: 'CONFIRMATION_REQUIRED',
      rich_result: null,
    }
  }

  const supabase = await createClient()

  switch (input.action) {
    case 'block': {
      if (!input.operative_id) return { text_result: 'operative_id required' }
      const { error } = await supabase
        .from('operatives')
        .update({ status: 'blocked' })
        .eq('id', input.operative_id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error blocking operative: ${error.message}` }
      return { text_result: 'Operative blocked successfully.' }
    }

    case 'unblock': {
      if (!input.operative_id) return { text_result: 'operative_id required' }
      const { error } = await supabase
        .from('operatives')
        .update({ status: 'available' })
        .eq('id', input.operative_id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error unblocking operative: ${error.message}` }
      return { text_result: 'Operative unblocked and set to available.' }
    }

    case 'change_status': {
      if (!input.operative_id || !input.data?.status) return { text_result: 'operative_id and data.status required' }
      const { error } = await supabase
        .from('operatives')
        .update({ status: input.data.status })
        .eq('id', input.operative_id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error changing status: ${error.message}` }
      return { text_result: `Operative status updated to ${input.data.status}.` }
    }

    case 'update': {
      if (!input.operative_id || !input.data) return { text_result: 'operative_id and data required' }
      const { error } = await supabase
        .from('operatives')
        .update(input.data)
        .eq('id', input.operative_id)
        .eq('organization_id', ORG_ID)
      if (error) return { text_result: `Error updating operative: ${error.message}` }
      return { text_result: 'Operative updated successfully.' }
    }

    case 'update_rates': {
      if (!input.operative_id || !input.data) return { text_result: 'operative_id and data required' }
      // Rates are stored in operative_pay_rates table, not directly on operatives
      const { error } = await supabase
        .from('operative_pay_rates')
        .insert({
          operative_id: input.operative_id,
          organization_id: ORG_ID,
          day_rate: input.data.day_rate ?? input.data.standard_day_rate ?? 0,
          effective_date: new Date().toISOString().split('T')[0],
          rate_type: 'revised' as const,
          notes: input.reason ?? 'Updated via Rex assistant',
        })
      if (error) return { text_result: `Error updating rates: ${error.message}` }
      return { text_result: 'Pay rates updated successfully.' }
    }

    default:
      return { text_result: `Action ${input.action} not yet implemented or not enabled.` }
  }
}
