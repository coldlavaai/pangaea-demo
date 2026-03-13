-- Migration 00030: NCR comments table + incident_time field
-- Run in Supabase SQL editor

-- 1. Add incident_time to NCRs (HH:MM text, nullable)
ALTER TABLE public.non_conformance_incidents
  ADD COLUMN IF NOT EXISTS incident_time text;

-- 2. Create NCR comments table
CREATE TABLE IF NOT EXISTS public.ncr_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  ncr_id uuid NOT NULL REFERENCES public.non_conformance_incidents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id),
  author_name text NOT NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ncr_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ncr_comments_org_access" ON public.ncr_comments
  USING (organization_id = get_my_org_id())
  WITH CHECK (organization_id = get_my_org_id());

-- Index for lookups
CREATE INDEX IF NOT EXISTS ncr_comments_ncr_id_idx ON public.ncr_comments(ncr_id);
