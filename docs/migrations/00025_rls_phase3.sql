-- ============================================================
-- Migration 00025: RLS Phase 3 — operatives, allocations, timesheets
-- ============================================================
-- Verified applied: 2026-03-01
--
-- Role matrix:
--   admin / staff   → full access (SELECT + write) within their org
--   site_manager    → SELECT only, scoped to their assigned sites
--   auditor         → SELECT only, all rows within their org
--
-- NOTE: get_my_site_ids() was also fixed in this migration:
--   - Changed RETURNS SETOF uuid → RETURNS uuid[] (required for ANY() in policies)
--   - Fixed auth_user_id bug: now joins users ON u.id = us.user_id WHERE u.auth_user_id = auth.uid()
-- ============================================================


-- BLOCK 1: get_my_org_id() helper
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_org_id() TO authenticated;


-- BLOCK 1c: Fix get_my_site_ids() — return type + auth_user_id bug
DROP FUNCTION IF EXISTS public.get_my_site_ids();

CREATE FUNCTION public.get_my_site_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY(
    SELECT us.site_id
    FROM public.user_sites us
    JOIN public.users u ON u.id = us.user_id
    WHERE u.auth_user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_my_site_ids() TO authenticated;


-- BLOCK 2: RLS on operatives
ALTER TABLE public.operatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operatives_admin_staff_all"
ON public.operatives
FOR ALL
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
)
WITH CHECK (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
);

CREATE POLICY "operatives_site_manager_select"
ON public.operatives
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'site_manager'
  AND EXISTS (
    SELECT 1 FROM public.allocations a
    WHERE a.operative_id = operatives.id
    AND a.site_id = ANY(get_my_site_ids())
  )
);

CREATE POLICY "operatives_auditor_select"
ON public.operatives
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'auditor'
);


-- BLOCK 3: RLS on allocations
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allocations_admin_staff_all"
ON public.allocations
FOR ALL
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
)
WITH CHECK (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
);

CREATE POLICY "allocations_site_manager_select"
ON public.allocations
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'site_manager'
  AND site_id = ANY(get_my_site_ids())
);

CREATE POLICY "allocations_auditor_select"
ON public.allocations
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'auditor'
);


-- BLOCK 4: RLS on timesheets
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheets_admin_staff_all"
ON public.timesheets
FOR ALL
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
)
WITH CHECK (
  organization_id = get_my_org_id()
  AND get_user_role() IN ('admin', 'staff')
);

CREATE POLICY "timesheets_site_manager_select"
ON public.timesheets
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'site_manager'
  AND EXISTS (
    SELECT 1 FROM public.allocations a
    WHERE a.operative_id = timesheets.operative_id
    AND a.site_id = ANY(get_my_site_ids())
  )
);

CREATE POLICY "timesheets_auditor_select"
ON public.timesheets
FOR SELECT
TO authenticated
USING (
  organization_id = get_my_org_id()
  AND get_user_role() = 'auditor'
);
