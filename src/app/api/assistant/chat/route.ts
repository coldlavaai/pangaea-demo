import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'
import { getAssistantFeatures } from '@/lib/assistant/settings'
import { buildTools } from '@/lib/assistant/tools'
import { buildSystemPrompt } from '@/lib/assistant/system-prompt'
import { createSSEStream } from '@/lib/assistant/stream'
import { toolExecutors, WRITE_TOOLS, WRITE_ACTIONS_THAT_SKIP_CONFIRM } from '@/lib/assistant/tool-registry'
import type { SSEEvent, RichBlock } from '@/lib/assistant/types'

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  // Use auth client only to verify the user, then switch to service client to bypass RLS.
  // assistant_conversations uses public.users.id (not auth UUID) so RLS blocks inserts/reads.
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const supabase = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const userRole = await getUserRole()
  const body = await request.json()
  const { message, conversationId: existingConvId } = body as { message: string; conversationId?: string }

  if (!message?.trim()) return new Response('Message required', { status: 400 })

  const { emit, stream, close } = createSSEStream()

  // Run async work in background, stream results
  ;(async () => {
    try {
      // Load features + build tools
      const features = await getAssistantFeatures()
      const enabledFeatures = new Set(features.filter(f => f.enabled).map(f => f.key))
      const tools = buildTools(enabledFeatures)

      // Look up public.users.id from auth UUID
      const { data: publicUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      const publicUserId = publicUser?.id
      if (!publicUserId) {
        emit({ type: 'error', message: 'User not found in system' })
        close()
        return
      }

      // Create or load conversation
      let conversationId = existingConvId
      if (!conversationId) {
        const { data: conv, error: convError } = await db
          .from('assistant_conversations')
          .insert({ organization_id: ORG_ID, user_id: publicUserId, title: 'New conversation' })
          .select('id')
          .single()
        if (convError) {
          emit({ type: 'error', message: `Failed to create conversation: ${convError.message}` })
          close()
          return
        }
        conversationId = conv?.id
      }

      if (!conversationId) {
        emit({ type: 'error', message: 'Failed to create conversation' })
        close()
        return
      }

      // Save user message
      const { error: insertErr } = await db.from('assistant_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
      })
      if (insertErr) {
        emit({ type: 'error', message: `Failed to save message: ${insertErr.message}` })
        close()
        return
      }

      // Load last 30 messages for context
      const { data: history } = await db
        .from('assistant_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(30)

      const messages: Anthropic.MessageParam[] = ((history ?? []) as Array<{ role: string; content: string }>)
        .filter(m => m.content?.trim())
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

      // Safety net — Anthropic requires at least one message
      if (messages.length === 0) {
        messages.push({ role: 'user', content: message })
      }

      const systemPrompt = buildSystemPrompt({
        userEmail: user.email ?? 'Unknown',
        userRole: userRole ?? 'staff',
        enabledFeatures: Array.from(enabledFeatures),
        orgName: 'Aztec Landscapes',
      })

      // Collect assistant response for saving
      let fullContent = ''
      const richBlocks: RichBlock[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolCallsRecord: any[] = []

      // Agentic loop
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentMessages: any[] = messages

      let continueLoop = true
      let loopIteration = 0
      while (continueLoop) {
        // Add newline separator between agentic loop iterations so text chunks don't run together
        if (loopIteration > 0 && fullContent && !fullContent.endsWith('\n')) {
          fullContent += '\n\n'
          emit({ type: 'text_delta', content: '\n\n' })
        }
        loopIteration++

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: systemPrompt,
          tools,
          messages: currentMessages,
          stream: true,
        })

        let currentToolUseId: string | null = null
        let currentToolName: string | null = null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let currentToolInput: any = {}
        let inputJsonAccumulator = ''
        let stopReason: string | null = null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assistantBlocks: any[] = []
        let currentTextBlock = ''

        for await (const chunk of response) {
          if (chunk.type === 'content_block_start') {
            if (chunk.content_block.type === 'text') {
              assistantBlocks.push({ type: 'text', text: '' })
            } else if (chunk.content_block.type === 'tool_use') {
              currentToolUseId = chunk.content_block.id
              currentToolName = chunk.content_block.name
              inputJsonAccumulator = ''
              assistantBlocks.push({ type: 'tool_use', id: chunk.content_block.id, name: chunk.content_block.name, input: {} })
            }
          } else if (chunk.type === 'content_block_delta') {
            if (chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              fullContent += text
              currentTextBlock += text
              // Update last text block
              const lastBlock = assistantBlocks[assistantBlocks.length - 1]
              if (lastBlock?.type === 'text') lastBlock.text += text
              emit({ type: 'text_delta', content: text })
            } else if (chunk.delta.type === 'input_json_delta') {
              inputJsonAccumulator += chunk.delta.partial_json
            }
          } else if (chunk.type === 'content_block_stop') {
            if (currentToolName && inputJsonAccumulator) {
              try {
                currentToolInput = JSON.parse(inputJsonAccumulator)
              } catch {
                currentToolInput = {}
              }
              // Update the tool_use block input
              const toolBlock = assistantBlocks.find(b => b.id === currentToolUseId)
              if (toolBlock) toolBlock.input = currentToolInput
            }
            currentTextBlock = ''
            inputJsonAccumulator = ''
          } else if (chunk.type === 'message_delta') {
            stopReason = chunk.delta.stop_reason
          }
        }

        // Add assistant message to current messages
        currentMessages = [...currentMessages, { role: 'assistant', content: assistantBlocks }]

        // Process tool calls
        const toolUseBlocks = assistantBlocks.filter(b => b.type === 'tool_use')

        if (toolUseBlocks.length === 0 || stopReason === 'end_turn') {
          continueLoop = false
          break
        }

        // Execute tools
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolResults: any[] = []

        for (const toolBlock of toolUseBlocks) {
          const toolName = toolBlock.name as string
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolInput = toolBlock.input as any

          // Determine action label for UI
          const actionLabel = toolInput.action ?? toolName
          emit({ type: 'tool_start', tool: toolName, action: actionLabel, description: `${toolName.replace(/_/g, ' ')} — ${actionLabel}` })

          // Check if write tool needs confirmation
          // ALF's confirmed flag is STRIPPED — only the UI confirm endpoint (/api/assistant/confirm)
          // can execute write tools. This prevents ALF from bypassing the confirmation card.
          const isWriteTool = WRITE_TOOLS.has(toolName)
          const skipConfirmKey = `${toolName}:${actionLabel}`
          const needsConfirm = isWriteTool && !WRITE_ACTIONS_THAT_SKIP_CONFIRM.has(skipConfirmKey)

          if (needsConfirm) {
            const confirmId = `${toolBlock.id}_confirm`
            const summary = buildConfirmationSummary(toolName, toolInput)
            emit({ type: 'confirmation_required', id: confirmId, tool: toolName, action: actionLabel, summary, input: toolInput })

            // Return tool result indicating confirmation needed
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: 'Action paused — waiting for user confirmation.',
            })
            continueLoop = false
          } else {
            const executor = toolExecutors[toolName]
            if (!executor) {
              toolResults.push({ type: 'tool_result', tool_use_id: toolBlock.id, content: `Tool ${toolName} not found.` })
              continue
            }

            const result = await executor(toolInput, publicUserId, conversationId)
            toolCallsRecord.push({ tool: toolName, action: actionLabel, input: toolInput, result: result.text_result })

            if (result.rich_result) {
              richBlocks.push(result.rich_result)
              emit({ type: 'tool_result', render_type: result.rich_result.type, data: result.rich_result.data })
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: result.text_result,
            })
          }
        }

        currentMessages = [...currentMessages, { role: 'user', content: toolResults }]
      }

      // Save assistant message
      const { data: savedMsg } = await db
        .from('assistant_messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullContent,
          tool_calls: toolCallsRecord.length > 0 ? toolCallsRecord : null,
          rich_data: richBlocks.length > 0 ? richBlocks : null,
        })
        .select('id')
        .single()

      // Auto-title conversation on first exchange
      const msgCount = (history as unknown[])?.length ?? 0
      if (msgCount <= 1) {
        const title = message.length > 60 ? message.substring(0, 57) + '...' : message
        await db
          .from('assistant_conversations')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', conversationId)
      } else {
        await db
          .from('assistant_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)
      }

      emit({ type: 'done', conversationId, messageId: savedMsg?.id ?? '' })
    } catch (err) {
      emit({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      close()
    }
  })()

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildConfirmationSummary(toolName: string, input: any): string {
  const action = input.action ?? 'unknown action'
  switch (toolName) {
    case 'operative_write':
      return `${action} operative${input.operative_id ? ` (ID: ${input.operative_id})` : ''}`
    case 'messaging':
      return input.operative_ids?.length
        ? `Send WhatsApp to ${input.operative_ids.length} operatives`
        : `Send message to operative ${input.operative_id}`
    case 'site_write':
      return `${action} site${input.site_id ? ` (ID: ${input.site_id})` : ''}`
    default:
      return `${toolName}: ${action}`
  }
}
