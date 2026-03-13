import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Database row shapes
// ============================================================

export interface WorkflowRunRow {
  id: string
  organization_id: string
  workflow_type: string
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'failed'
  triggered_by: string
  triggered_by_user: string | null
  conversation_id: string | null
  config: Record<string, unknown>
  channel: string
  follow_up_hours: number
  max_follow_ups: number
  total_targets: number
  targets_contacted: number
  targets_responded: number
  targets_completed: number
  targets_failed: number
  site_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface WorkflowTargetRow {
  id: string
  workflow_run_id: string
  operative_id: string
  status: 'pending' | 'contacted' | 'responded' | 'completed' | 'failed' | 'timed_out' | 'skipped'
  engagement_state: 're_engaged' | 'engaged' | null
  data: Record<string, unknown>
  messages_sent: number
  last_contacted_at: string | null
  next_follow_up_at: string | null
  response_text: string | null
  response_at: string | null
  outcome: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowTargetWithOperative extends WorkflowTargetRow {
  operative: {
    first_name: string
    last_name: string
    phone: string | null
    email: string | null
    cscs_card_type: string | null
    preferred_language: string | null
  }
}

// ============================================================
// Engine types
// ============================================================

export interface WorkflowContext {
  run: WorkflowRunRow
  supabase: SupabaseClient
  orgId: string
}

// ============================================================
// Workflow definition — one per workflow type
// ============================================================

export interface WorkflowDefinition {
  type: string
  label: string
  description: string
  requiredParams: string[]

  /** Called when the workflow is first triggered — sends initial messages to all targets */
  onTrigger: (ctx: WorkflowContext) => Promise<void>

  /**
   * Called when an operative replies to a RE_ENGAGE message (engagement_state transitions
   * from 're_engaged' → 'engaged'). This is where the workflow sends its actual content
   * (offer details, document links, etc.) now that the operative is actively engaged.
   * Returns a reply string or null.
   */
  onEngaged?: (
    ctx: WorkflowContext,
    target: WorkflowTargetWithOperative,
  ) => Promise<string | null>

  /** Called when an inbound WhatsApp arrives during an active workflow — returns reply string or null */
  onInbound: (
    ctx: WorkflowContext,
    target: WorkflowTargetWithOperative,
    message: string,
    media?: { url: string; type: string }
  ) => Promise<string | null>

  /** Called when an operative uploads a document via the /apply/[token] portal */
  onUpload: (
    ctx: WorkflowContext,
    target: WorkflowTargetWithOperative,
    documentId: string
  ) => Promise<void>

  /** Called by cron when next_follow_up_at has passed and messages_sent < max_follow_ups */
  onFollowUp: (ctx: WorkflowContext, target: WorkflowTargetWithOperative) => Promise<void>

  /** Called by cron when messages_sent >= max_follow_ups — escalate to staff */
  onTimeout: (ctx: WorkflowContext, target: WorkflowTargetWithOperative) => Promise<void>
}
