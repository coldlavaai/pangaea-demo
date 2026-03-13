// Core types for the ALF AI Assistant system

export interface AssistantConversation {
  id: string
  organization_id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface AssistantMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  tool_calls?: ToolCallRecord[] | null
  rich_data?: RichBlock[] | null
  created_at: string
}

export interface ToolCallRecord {
  tool: string
  action: string
  input: Record<string, unknown>
  result: unknown
}

// Rich display block types
export type RichBlockType =
  | 'operative_table'
  | 'operative_card'
  | 'stats_grid'
  | 'site_table'
  | 'allocation_table'
  | 'ncr_list'
  | 'timesheet_table'
  | 'confirmation_card'
  | 'action_buttons'
  | 'deep_link'
  | 'document_list'
  | 'data_table'
  | 'progress'
  | 'workflow_status'
  | 'missing_fields'

export interface RichBlock {
  type: RichBlockType
  data: unknown
}

// SSE event types streamed from the API
export type SSEEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_start'; tool: string; action: string; description: string }
  | { type: 'tool_result'; render_type: RichBlockType; data: unknown }
  | { type: 'confirmation_required'; id: string; tool: string; action: string; summary: string; input: Record<string, unknown> }
  | { type: 'progress'; current: number; total: number; description: string }
  | { type: 'done'; conversationId: string; messageId: string }
  | { type: 'error'; message: string }

// Tool executor result
export interface ToolResult {
  text_result: string
  rich_result?: RichBlock | null
}

// Feature toggle
export interface AssistantFeature {
  key: string
  enabled: boolean
  description: string
  category: string
}

// Task
export interface AssistantTask {
  id: string
  organization_id: string
  created_by: string
  assigned_to: string
  title: string
  description?: string | null
  due_date?: string | null
  reminder_at?: string | null
  reminder_sent: boolean
  status: 'pending' | 'in_progress' | 'done' | 'cancelled'
  conversation_id?: string | null
  created_at: string
}
