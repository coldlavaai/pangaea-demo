-- Migration 00024 — RBAC Phase 1: schema, JWT hook, helper functions
-- Run via Supabase SQL editor
-- After running this migration:
--   1. Enable JWT hook in Supabase Dashboard → Authentication → Hooks → Custom Access Token → public.custom_access_token_hook
--   2. Update Oliver's user to admin: UPDATE public.users SET role = 'admin' WHERE email = 'oliver@coldlava.ai';
--   3. Deploy Phase 2 app code before enabling RLS on main tables (Phase 3)

-- ============================================================
-- 1. Add new values to the existing user_role enum
-- ============================================================
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'site_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'auditor';

-- ============================================================
-- 2. Remap legacy roles — director and labour_manager → staff
-- ============================================================
UPDATE public.users
SET role = 'staff'
WHERE role IN ('director', 'labour_manager');

-- ============================================================
-- 3. Create user_sites join table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_sites (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  site_id         UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sites_user_id ON public.user_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sites_site_id ON public.user_sites(site_id);

-- ============================================================
-- 4. Enable RLS on user_sites
-- ============================================================
ALTER TABLE public.user_sites ENABLE ROW LEVEL SECURITY;

-- Only admins can manage user_sites assignments
CREATE POLICY "admin_manage_user_sites"
ON public.user_sites
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'user_role') = 'admin'
)
WITH CHECK (
  (auth.jwt() ->> 'user_role') = 'admin'
);

-- Users can read their own site assignments (needed for get_my_site_ids() fallback)
CREATE POLICY "users_read_own_sites"
ON public.user_sites
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- 5. JWT hook helper functions
-- ============================================================

-- Grant supabase_auth_admin access to read users table (required for hook)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.users TO supabase_auth_admin;

-- Custom Access Token Hook — injects user_role into every JWT issued
-- Must be registered in Supabase Dashboard → Auth → Hooks after this runs
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims    JSONB;
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"staff"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Restrict execution: only supabase_auth_admin can call this
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- ============================================================
-- 6. RLS helper: get_user_role()
-- ============================================================
-- SECURITY DEFINER so it bypasses users table RLS (avoids recursion)
-- Uses (SELECT ...) pattern in policies to evaluate once per query, not per row
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid()
$$;

-- ============================================================
-- 7. RLS helper: get_my_site_ids()
-- ============================================================
-- Returns site UUIDs assigned to the current user
-- SECURITY DEFINER bypasses user_sites RLS (avoids recursive policy evaluation)
CREATE OR REPLACE FUNCTION public.get_my_site_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT site_id FROM public.user_sites WHERE user_id = auth.uid()
$$;

-- ============================================================
-- 8. Performance indexes on allocations (for site_manager RLS — Phase 3)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_allocations_operative_site_status
  ON public.allocations(operative_id, site_id, status);

CREATE INDEX IF NOT EXISTS idx_allocations_site_id_status
  ON public.allocations(site_id, status);

-- ============================================================
-- AFTER RUNNING THIS MIGRATION:
-- 1. Enable JWT hook in Dashboard → Auth → Hooks → Custom Access Token → public.custom_access_token_hook
-- 2. Run: UPDATE public.users SET role = 'admin' WHERE email = 'oliver@coldlava.ai';
-- 3. Sign out and back in — verify user_role = 'admin' is in the JWT (use jwt.io to decode)
-- ============================================================
