-- ============================================================
-- MIGRATION 00011: Gender, Machine Operator flag, Onboarding checklist
-- Source: Giant new starter form + New starter checklist (Rev 2) + Company induction
-- ============================================================

ALTER TABLE public.operatives
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS machine_operator BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_blue_sticker_issued BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_buddy_allocated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_two_week_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_induction_complete BOOLEAN DEFAULT FALSE;

ALTER TABLE public.operatives
  ADD CONSTRAINT operatives_gender_check CHECK (
    gender IS NULL OR gender IN ('male', 'female', 'prefer_not_to_say')
  );

COMMENT ON COLUMN public.operatives.gender IS 'From Giant new starter form and company induction form';
COMMENT ON COLUMN public.operatives.machine_operator IS 'Qualified to operate Digger / Telehandler / Dumper (from Giant new starter form)';
COMMENT ON COLUMN public.operatives.onboarding_blue_sticker_issued IS 'Provisional ID sticker issued — removed when permanent CSCS card arrives';
COMMENT ON COLUMN public.operatives.onboarding_buddy_allocated IS 'Buddy / mentor allocated on first day';
COMMENT ON COLUMN public.operatives.onboarding_two_week_review IS '2-week check-in review completed';
COMMENT ON COLUMN public.operatives.onboarding_induction_complete IS 'Company induction completed and signed';
