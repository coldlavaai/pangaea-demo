import type Anthropic from '@anthropic-ai/sdk'

export type ToolDefinition = Anthropic.Tool

export function buildTools(enabledFeatures: Set<string>): ToolDefinition[] {
  const tools: ToolDefinition[] = []

  // operative_read
  if (
    enabledFeatures.has('read_operative_search') ||
    enabledFeatures.has('read_operative_profiles') ||
    enabledFeatures.has('read_operative_stats') ||
    enabledFeatures.has('read_operative_compliance') ||
    enabledFeatures.has('read_operative_documents')
  ) {
    tools.push({
      name: 'operative_read',
      description: 'Read operative data. Search operatives, get profiles, view stats, check compliance, or list documents.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: {
            type: 'string',
            enum: ['search', 'get_profile', 'get_stats', 'get_compliance', 'get_documents'],
            description: 'The action to perform',
          },
          operative_id: { type: 'string', description: 'Operative UUID (for get_profile, get_compliance, get_documents)' },
          query: { type: 'string', description: 'Search by name or phone only — NOT for trade names' },
          status: { type: 'string', description: 'Filter by status: prospect|qualifying|pending_docs|verified|available|working|unavailable|blocked' },
          trade: { type: 'string', description: 'Filter by trade name (e.g. "bricklayer", "groundworker"). Use this — not query — for trade-based searches.' },
          cscs_type: { type: 'string', description: 'Filter by CSCS card type: green|blue|gold|black|red|white' },
          expiring_cscs_days: { type: 'number', description: 'Filter operatives with CSCS expiring in N days' },
          has_phone: { type: 'boolean', description: 'Filter to only operatives with a phone number' },
          min_completeness_score: { type: 'number', description: 'Filter by minimum data_completeness_score (0-24). Use 22 for >90% complete.' },
          max_completeness_score: { type: 'number', description: 'Filter by maximum score — use to find incomplete profiles (e.g. ≤18).' },
          has_email: { type: 'boolean', description: 'true = must have email, false = no email stored' },
          missing_phone: { type: 'boolean', description: 'true = no phone number stored' },
          missing_email: { type: 'boolean', description: 'true = no email stored' },
          nationality: { type: 'string', description: 'Filter by nationality (e.g. "Romanian", "Polish")' },
          language: { type: 'string', description: 'Filter by language spoken (e.g. "Romanian", "English")' },
          limit: { type: 'number', description: 'Max results (default 20, max 100)' },
        },
        required: ['action'],
      },
    })
  }

  // operative_write
  if (
    enabledFeatures.has('write_operative_create') ||
    enabledFeatures.has('write_operative_update') ||
    enabledFeatures.has('write_operative_delete') ||
    enabledFeatures.has('write_operative_status') ||
    enabledFeatures.has('write_operative_rates')
  ) {
    tools.push({
      name: 'operative_write',
      description: 'Write operative data. Create, update, block/unblock operatives, or update pay rates.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: {
            type: 'string',
            enum: ['create', 'update', 'delete', 'block', 'unblock', 'change_status', 'update_rates'],
          },
          operative_id: { type: 'string', description: 'Operative UUID' },
          data: { type: 'object', description: 'Fields to create/update' },
          reason: { type: 'string', description: 'Reason for the change (for audit log)' },
          confirmed: { type: 'boolean', description: 'Set to true after user has confirmed the action' },
        },
        required: ['action'],
      },
    })
  }

  // site_read
  if (enabledFeatures.has('read_sites')) {
    tools.push({
      name: 'site_read',
      description: 'Read site data. List sites, get details, or get headcount.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: { type: 'string', enum: ['list', 'get_detail', 'get_headcount'] },
          site_id: { type: 'string', description: 'Site UUID' },
          query: { type: 'string', description: 'Search query' },
          status: { type: 'string', description: 'Filter by status: active|completed|on_hold|cancelled' },
        },
        required: ['action'],
      },
    })
  }

  // site_write
  if (enabledFeatures.has('write_operative_create')) { // reuse as proxy for write access
    tools.push({
      name: 'site_write',
      description: 'Create or update sites.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: { type: 'string', enum: ['create', 'update'] },
          site_id: { type: 'string' },
          data: { type: 'object' },
          confirmed: { type: 'boolean' },
        },
        required: ['action', 'data'],
      },
    })
  }

  // operations_read
  if (
    enabledFeatures.has('read_allocations') ||
    enabledFeatures.has('read_timesheets') ||
    enabledFeatures.has('read_requests') ||
    enabledFeatures.has('read_shifts') ||
    enabledFeatures.has('read_adverts')
  ) {
    tools.push({
      name: 'operations_read',
      description: 'Read operational data: allocations (who is working where), timesheets, labour requests, shifts, adverts, agencies.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: {
            type: 'string',
            enum: ['get_allocations', 'get_timesheets', 'get_requests', 'get_shifts', 'get_adverts', 'get_agencies'],
          },
          operative_id: { type: 'string' },
          site_id: { type: 'string' },
          status: { type: 'string' },
          date_from: { type: 'string', description: 'ISO date string' },
          date_to: { type: 'string', description: 'ISO date string' },
          limit: { type: 'number' },
        },
        required: ['action'],
      },
    })
  }

  // operations_write
  if (
    enabledFeatures.has('write_allocations') ||
    enabledFeatures.has('write_requests') ||
    enabledFeatures.has('write_timesheets') ||
    enabledFeatures.has('write_documents')
  ) {
    tools.push({
      name: 'operations_write',
      description: 'Write operational data: create/terminate allocations, create/update requests, approve/reject timesheets, verify/reject documents.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: {
            type: 'string',
            enum: ['create_allocation', 'terminate_allocation', 'create_request', 'update_request', 'approve_timesheet', 'reject_timesheet', 'verify_document', 'reject_document'],
          },
          id: { type: 'string', description: 'Resource UUID' },
          data: { type: 'object' },
          reason: { type: 'string' },
          confirmed: { type: 'boolean' },
        },
        required: ['action'],
      },
    })
  }

  // quality_read
  if (enabledFeatures.has('read_ncrs') || enabledFeatures.has('read_rap_scores') || enabledFeatures.has('read_reports')) {
    tools.push({
      name: 'quality_read',
      description: 'Read quality data: NCRs (Non-Conformance Reports), RAP scores (Reliability/Attitude/Performance), and reports.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: { type: 'string', enum: ['get_ncrs', 'get_rap_scores', 'get_reports'] },
          operative_id: { type: 'string' },
          site_id: { type: 'string' },
          severity: { type: 'string', description: 'minor|major|critical' },
          status: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['action'],
      },
    })
  }

  // quality_write
  if (enabledFeatures.has('write_ncrs') || enabledFeatures.has('write_rap_reviews')) {
    tools.push({
      name: 'quality_write',
      description: 'Write quality data: create/update NCRs, add RAP reviews (reliability, attitude, performance, safety scores 1-5).',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: { type: 'string', enum: ['create_ncr', 'update_ncr', 'add_ncr_comment', 'add_rap_review'] },
          id: { type: 'string' },
          data: { type: 'object' },
          confirmed: { type: 'boolean' },
        },
        required: ['action'],
      },
    })
  }

  // comms_read
  if (enabledFeatures.has('read_whatsapp_history') || enabledFeatures.has('read_activity_feed')) {
    tools.push({
      name: 'comms_read',
      description: 'Read communications: WhatsApp message history, activity feed.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: { type: 'string', enum: ['get_whatsapp_history', 'get_activity_feed'] },
          operative_id: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['action'],
      },
    })
  }

  // messaging
  if (enabledFeatures.has('messaging_whatsapp') || enabledFeatures.has('messaging_email') || enabledFeatures.has('messaging_telegram')) {
    tools.push({
      name: 'messaging',
      description: 'Send messages: WhatsApp (individual or bulk), email, Telegram notifications.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: {
            type: 'string',
            enum: ['send_whatsapp', 'send_whatsapp_template', 'send_email', 'bulk_send_whatsapp', 'bulk_send_email', 'send_notification', 'send_telegram'],
          },
          operative_id: { type: 'string' },
          operative_ids: { type: 'array', items: { type: 'string' }, description: 'For bulk operations' },
          message: { type: 'string' },
          subject: { type: 'string', description: 'For email' },
          template_sid: { type: 'string', description: 'Twilio ContentSid (HX...) for WhatsApp template messages' },
          template_variables: { type: 'object', description: 'Shared template variable values e.g. {"1": "James", "2": "St Catherines"}' },
          template_variables_map: { type: 'object', description: 'Per-operative template variables keyed by operative_id — use for bulk sends where name varies' },
          confirmed: { type: 'boolean' },
        },
        required: ['action'],
      },
    })
  }

  // recommend_operatives — always available if operative read is enabled
  if (enabledFeatures.has('read_operative_search') || enabledFeatures.has('read_operative_profiles')) {
    tools.push({
      name: 'recommend_operatives',
      description: 'Score and rank operatives for a specific job. Fetches full profiles including RAP scores, experience, certifications, notes, languages, NCR history, distance from site, and recency of work. Use this when asked to recommend, find the best candidates, or "who should I send" for a site. Always prefer this over operative_read when making recommendations.',
      input_schema: {
        type: 'object' as const,
        properties: {
          trade: { type: 'string', description: 'Trade name required (e.g. "bricklayer"). Slang accepted (brickies, sparks, etc.)' },
          quantity: { type: 'number', description: 'Number of operatives needed (default 3)' },
          site_id: { type: 'string', description: 'Site UUID — use this or site_name' },
          site_name: { type: 'string', description: 'Site name to search — use this or site_id' },
          job_description: { type: 'string', description: 'Free text context about the job (e.g. "sandstone wall repair", "must speak Romanian", "heavy plant operation") — used by AI for reasoning' },
          start_date: { type: 'string', description: 'ISO date for job start — passed to contact templates' },
          day_rate: { type: 'number', description: 'Day rate in GBP — passed to contact templates' },
          min_rap: { type: 'number', description: 'Minimum average RAP score (1–5)' },
          cscs_required: { type: 'boolean', description: 'If true, exclude operatives with expired or missing CSCS' },
          language: { type: 'string', description: 'Required language (e.g. "Romanian")' },
          nationality: { type: 'string', description: 'Required nationality' },
          machine_operator: { type: 'boolean', description: 'If true, only operatives qualified as machine operators' },
        },
        required: ['trade'],
      },
    })
  }

  // admin
  if (enabledFeatures.has('admin_users') || enabledFeatures.has('admin_settings') || enabledFeatures.has('admin_advert_copy')) {
    tools.push({
      name: 'admin',
      description: 'Admin actions: manage users/roles, generate advert copy, create/publish adverts.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: {
            type: 'string',
            enum: ['invite_user', 'update_role', 'enable_user', 'disable_user', 'manage_trades', 'generate_advert_copy', 'create_advert', 'publish_advert'],
          },
          data: { type: 'object' },
          confirmed: { type: 'boolean' },
        },
        required: ['action'],
      },
    })
  }

  // tasks (always available if enabled)
  if (enabledFeatures.has('tasks')) {
    tools.push({
      name: 'tasks',
      description: 'Manage tasks and reminders for the team.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: { type: 'string', enum: ['create_task', 'list_tasks', 'complete_task', 'assign_task', 'set_reminder'] },
          task_id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          assigned_to_user_id: { type: 'string' },
          due_date: { type: 'string' },
          reminder_at: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['action'],
      },
    })
  }

  // workflows
  if (enabledFeatures.has('workflows')) {
    tools.push({
      name: 'workflows',
      description: 'Start, monitor, or cancel multi-step workflow campaigns — document chasing, data collection, job offers. Use this when the action needs tracking, follow-ups, or involves multiple operatives who all need the same thing.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action: {
            type: 'string',
            enum: ['trigger', 'get_status', 'list_active', 'cancel'],
            description: 'trigger=start a new workflow, get_status=check progress, list_active=show all running, cancel=stop a workflow',
          },
          workflow_type: {
            type: 'string',
            enum: ['profile_completion', 'document_chase', 'data_collection', 'job_offer'],
            description: 'profile_completion: ONE link collecting both data fields AND documents (use for missing fields card actions) | document_chase: single doc upload request | data_collection: single field via WhatsApp reply | job_offer: send offers and track YES/NO',
          },
          workflow_id: { type: 'string', description: 'Workflow run UUID — for get_status and cancel' },
          operative_id: { type: 'string', description: 'Single operative UUID' },
          operative_ids: { type: 'array', items: { type: 'string' }, description: 'Multiple operative UUIDs for bulk operations' },
          site_id: { type: 'string', description: 'Site UUID — required for job_offer' },
          document_type: { type: 'string', enum: ['right_to_work', 'passport', 'cscs_card', 'photo_id', 'cpcs_ticket', 'npors_ticket', 'first_aid', 'other'], description: 'Required for document_chase. Use passport when specifically requesting a passport; photo_id when either passport or driving licence is acceptable.' },
          data_field: { type: 'string', enum: ['email', 'phone', 'address', 'bank_details', 'ni_number', 'utr', 'nok_name', 'nok_phone', 'date_of_birth'], description: 'Single field to collect — use for one-field data_collection' },
          data_fields: { type: 'array', items: { type: 'string', enum: ['email', 'phone', 'address', 'bank_details', 'ni_number', 'utr', 'nok_name', 'nok_phone', 'date_of_birth'] }, description: 'Data fields for profile_completion or data_collection workflows.' },
          document_types: { type: 'array', items: { type: 'string', enum: ['right_to_work', 'photo_id', 'cscs_card', 'cpcs_ticket', 'npors_ticket', 'first_aid', 'other'] }, description: 'Document types for profile_completion workflow. Use alongside data_fields to collect everything in one link.' },
          day_rate: { type: 'number', description: 'Day rate in GBP — required for job_offer' },
          start_date: { type: 'string', description: 'ISO date — required for job_offer' },
          channel: { type: 'string', enum: ['whatsapp', 'email'], description: 'Communication channel (default: whatsapp)' },
          confirmed: { type: 'boolean', description: 'Set to true after user confirms the action' },
        },
        required: ['action'],
      },
    })
  }

  // navigation (always available)
  tools.push({
    name: 'navigation',
    description: 'Generate deep links to BOS pages so the user can navigate directly.',
    input_schema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['link_to_page'] },
        page: {
          type: 'string',
          enum: ['dashboard', 'operatives', 'sites', 'requests', 'allocations', 'shifts', 'timesheets', 'documents', 'ncrs', 'reports', 'activity', 'comms', 'adverts', 'settings', 'audit-log'],
          description: 'The page to link to',
        },
        id: { type: 'string', description: 'Optional resource ID for detail pages' },
      },
      required: ['action', 'page'],
    },
  })

  return tools
}
