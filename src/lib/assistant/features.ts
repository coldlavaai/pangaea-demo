export interface FeatureDefinition {
  key: string
  description: string
  category: string
  defaultEnabled: boolean
}

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // Read: Operatives
  { key: 'read_operative_search', description: 'Search and filter operatives', category: 'Read: Operatives', defaultEnabled: true },
  { key: 'read_operative_profiles', description: 'View operative profiles and details', category: 'Read: Operatives', defaultEnabled: true },
  { key: 'read_operative_stats', description: 'View workforce statistics', category: 'Read: Operatives', defaultEnabled: true },
  { key: 'read_operative_compliance', description: 'View compliance and document status', category: 'Read: Operatives', defaultEnabled: true },
  { key: 'read_operative_documents', description: 'View operative documents', category: 'Read: Operatives', defaultEnabled: true },
  // Read: Operations
  { key: 'read_sites', description: 'View sites and headcount', category: 'Read: Operations', defaultEnabled: true },
  { key: 'read_allocations', description: 'View allocations and assignments', category: 'Read: Operations', defaultEnabled: true },
  { key: 'read_timesheets', description: 'View timesheets and pay data', category: 'Read: Operations', defaultEnabled: true },
  { key: 'read_requests', description: 'View labour requests', category: 'Read: Operations', defaultEnabled: true },
  { key: 'read_shifts', description: 'View shifts', category: 'Read: Operations', defaultEnabled: true },
  { key: 'read_adverts', description: 'View adverts and recruitment', category: 'Read: Operations', defaultEnabled: true },
  { key: 'read_agencies', description: 'View agency data', category: 'Read: Operations', defaultEnabled: true },
  // Read: Quality
  { key: 'read_ncrs', description: 'View NCRs and quality data', category: 'Read: Quality', defaultEnabled: true },
  { key: 'read_rap_scores', description: 'View RAP scores', category: 'Read: Quality', defaultEnabled: true },
  { key: 'read_reports', description: 'View reports', category: 'Read: Quality', defaultEnabled: true },
  // Read: Communications
  { key: 'read_whatsapp_history', description: 'View WhatsApp message history', category: 'Read: Communications', defaultEnabled: true },
  { key: 'read_activity_feed', description: 'View activity feed', category: 'Read: Communications', defaultEnabled: true },
  // Write: Operatives
  { key: 'write_operative_create', description: 'Create new operatives', category: 'Write: Operatives', defaultEnabled: false },
  { key: 'write_operative_update', description: 'Update operative details', category: 'Write: Operatives', defaultEnabled: false },
  { key: 'write_operative_delete', description: 'Delete operatives', category: 'Write: Operatives', defaultEnabled: false },
  { key: 'write_operative_status', description: 'Block/unblock operatives', category: 'Write: Operatives', defaultEnabled: false },
  { key: 'write_operative_rates', description: 'Update pay rates', category: 'Write: Operatives', defaultEnabled: false },
  // Write: Operations
  { key: 'write_allocations', description: 'Create and terminate allocations', category: 'Write: Operations', defaultEnabled: false },
  { key: 'write_requests', description: 'Create and update labour requests', category: 'Write: Operations', defaultEnabled: false },
  { key: 'write_timesheets', description: 'Approve and reject timesheets', category: 'Write: Operations', defaultEnabled: false },
  { key: 'write_documents', description: 'Verify and reject documents', category: 'Write: Operations', defaultEnabled: false },
  // Write: Quality
  { key: 'write_ncrs', description: 'Create and update NCRs', category: 'Write: Quality', defaultEnabled: false },
  { key: 'write_rap_reviews', description: 'Add RAPS reviews (Reliability, Attitude, Performance, Safety)', category: 'Write: Quality', defaultEnabled: true },
  // Messaging
  { key: 'messaging_whatsapp', description: 'Send WhatsApp messages', category: 'Messaging: WhatsApp', defaultEnabled: false },
  { key: 'messaging_email', description: 'Send emails', category: 'Messaging: Email', defaultEnabled: false },
  { key: 'messaging_telegram', description: 'Send Telegram messages', category: 'Messaging: Telegram', defaultEnabled: false },
  // Admin
  { key: 'admin_users', description: 'Manage users and roles', category: 'Admin: Users', defaultEnabled: false },
  { key: 'admin_settings', description: 'Manage system settings', category: 'Admin: Settings', defaultEnabled: false },
  { key: 'admin_advert_copy', description: 'Generate advert copy using AI', category: 'Admin: Settings', defaultEnabled: true },
  // Tasks
  { key: 'tasks', description: 'Create and manage tasks/reminders', category: 'Tasks', defaultEnabled: true },
  // Workflows
  { key: 'workflows', description: 'Trigger and manage automated workflow campaigns (document chase, data collection, job offers)', category: 'Workflows', defaultEnabled: false },
]
