import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { ToolResult } from '../types'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeAdmin(input: any): Promise<ToolResult> {
  // advert copy generation doesn't need confirmation
  if (input.action === 'generate_advert_copy') {
    const anthropic = new Anthropic()
    const { trade, location, rate, requirements } = input.data ?? {}

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Write a compelling job advert for a ${trade} position in ${location} at £${rate}/day. Requirements: ${requirements ?? 'standard groundworks experience, CSCS card required'}. Keep it punchy and professional, max 150 words.`,
      }],
    })

    const copy = response.content[0].type === 'text' ? response.content[0].text : ''
    return { text_result: `Generated advert copy:\n\n${copy}` }
  }

  if (!input.confirmed) return { text_result: 'CONFIRMATION_REQUIRED', rich_result: null }

  const supabase = await createClient()

  switch (input.action) {
    case 'create_advert': {
      const { data, error } = await supabase
        .from('advert_templates')
        .insert({ ...input.data, organization_id: ORG_ID })
        .select()
        .single()
      if (error) return { text_result: `Error creating advert: ${error.message}` }
      return { text_result: `Advert template "${data.name}" created.` }
    }

    default:
      return { text_result: `Admin action ${input.action} not yet implemented.` }
  }
}
