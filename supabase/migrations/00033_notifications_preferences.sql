-- Migration 00033: Notification preferences + enhanced notifications
-- Run in Supabase SQL editor

-- Create notifications table if not exists (was created manually in Aztec)
CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  severity        TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  operative_id    UUID REFERENCES public.operatives(id) ON DELETE SET NULL,
  labour_request_id UUID REFERENCES public.labour_requests(id) ON DELETE SET NULL,
  read            BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(organization_id, read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON public.notifications
  FOR ALL USING (organization_id = get_user_org_id());

-- Add link_url to notifications table for click-through navigation
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_url text;

-- Add ncr_id FK for NCR-specific notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS ncr_id uuid REFERENCES public.non_conformance_incidents(id) ON DELETE SET NULL;

-- Add receive_notifications to users — controls Telegram DM push (defaults true so existing users opt in)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS receive_notifications boolean NOT NULL DEFAULT true;

-- Enable Supabase Realtime on notifications so AlertsBell gets live badge updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
