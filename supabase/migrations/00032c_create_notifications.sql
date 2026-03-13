-- Create notifications table (was created manually in Aztec, needs migration here)
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
