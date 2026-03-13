-- ALF AI Assistant Tables
-- Run in Supabase SQL Editor

-- Conversations
CREATE TABLE IF NOT EXISTS public.assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asst_conv_user ON assistant_conversations(user_id, updated_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB DEFAULT NULL,
  rich_data JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asst_msg_conv ON assistant_messages(conversation_id, created_at ASC);

-- Tasks
CREATE TABLE IF NOT EXISTS public.assistant_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by UUID NOT NULL REFERENCES public.users(id),
  assigned_to UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  reminder_at TIMESTAMPTZ,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  conversation_id UUID REFERENCES public.assistant_conversations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asst_tasks_assigned ON assistant_tasks(assigned_to, status, due_date);
CREATE INDEX IF NOT EXISTS idx_asst_tasks_reminder ON assistant_tasks(reminder_at, reminder_sent) WHERE status = 'pending';

-- Settings / Feature Toggles
CREATE TABLE IF NOT EXISTS public.assistant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  UNIQUE (organization_id, feature_key)
);
CREATE INDEX IF NOT EXISTS idx_asst_settings_org ON assistant_settings(organization_id);

-- Seed default feature toggles for existing org
INSERT INTO public.assistant_settings (organization_id, feature_key, enabled, description, category)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'read_operative_search', true, 'Search and filter operatives', 'Read: Operatives'),
  ('00000000-0000-0000-0000-000000000001', 'read_operative_profiles', true, 'View operative profiles and details', 'Read: Operatives'),
  ('00000000-0000-0000-0000-000000000001', 'read_operative_stats', true, 'View workforce statistics', 'Read: Operatives'),
  ('00000000-0000-0000-0000-000000000001', 'read_operative_compliance', true, 'View compliance and document status', 'Read: Operatives'),
  ('00000000-0000-0000-0000-000000000001', 'read_operative_documents', true, 'View operative documents', 'Read: Operatives'),
  ('00000000-0000-0000-0000-000000000001', 'read_sites', true, 'View sites and headcount', 'Read: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'read_allocations', true, 'View allocations and assignments', 'Read: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'read_timesheets', true, 'View timesheets and pay data', 'Read: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'read_requests', true, 'View labour requests', 'Read: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'read_shifts', true, 'View shifts', 'Read: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'read_adverts', true, 'View adverts and recruitment data', 'Read: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'read_agencies', true, 'View agency data', 'Read: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'read_ncrs', true, 'View NCRs and quality data', 'Read: Quality'),
  ('00000000-0000-0000-0000-000000000001', 'read_rap_scores', true, 'View RAP (Reliability/Attitude/Performance) scores', 'Read: Quality'),
  ('00000000-0000-0000-0000-000000000001', 'read_reports', true, 'View reports', 'Read: Quality'),
  ('00000000-0000-0000-0000-000000000001', 'read_whatsapp_history', true, 'View WhatsApp message history', 'Read: Communications'),
  ('00000000-0000-0000-0000-000000000001', 'read_activity_feed', true, 'View activity feed', 'Read: Communications'),
  ('00000000-0000-0000-0000-000000000001', 'write_operative_create', false, 'Create new operatives', 'Write: Operatives'),
  ('00000000-0000-0000-0000-000000000001', 'write_operative_update', false, 'Update operative details', 'Write: Operatives'),
  ('00000000-0000-0000-0000-000000000001', 'write_operative_delete', false, 'Delete operatives', 'Write: Operatives'),
  ('00000000-0000-0000-0000-000000000001', 'write_operative_status', false, 'Change operative status (block/unblock)', 'Write: Operatives'),
  ('00000000-0000-0000-0000-000000000001', 'write_operative_rates', false, 'Update pay rates', 'Write: Operatives'),
  ('00000000-0000-0000-0000-000000000001', 'write_allocations', false, 'Create and terminate allocations', 'Write: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'write_requests', false, 'Create and update labour requests', 'Write: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'write_timesheets', false, 'Approve and reject timesheets', 'Write: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'write_documents', false, 'Verify and reject documents', 'Write: Operations'),
  ('00000000-0000-0000-0000-000000000001', 'write_ncrs', false, 'Create and update NCRs', 'Write: Quality'),
  ('00000000-0000-0000-0000-000000000001', 'write_rap_reviews', false, 'Add RAP reviews', 'Write: Quality'),
  ('00000000-0000-0000-0000-000000000001', 'messaging_whatsapp', false, 'Send WhatsApp messages', 'Messaging: WhatsApp'),
  ('00000000-0000-0000-0000-000000000001', 'messaging_email', false, 'Send emails', 'Messaging: Email'),
  ('00000000-0000-0000-0000-000000000001', 'messaging_telegram', false, 'Send Telegram messages', 'Messaging: Telegram'),
  ('00000000-0000-0000-0000-000000000001', 'admin_users', false, 'Manage users and roles', 'Admin: Users'),
  ('00000000-0000-0000-0000-000000000001', 'admin_settings', false, 'Manage system settings', 'Admin: Settings'),
  ('00000000-0000-0000-0000-000000000001', 'admin_advert_copy', true, 'Generate advert copy using AI', 'Admin: Settings'),
  ('00000000-0000-0000-0000-000000000001', 'tasks', true, 'Create and manage tasks/reminders', 'Tasks')
ON CONFLICT (organization_id, feature_key) DO NOTHING;
