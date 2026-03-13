-- Migration 00064: Sync Pangaea schema with Aztec BOS
-- Adds 14 missing tables/views + 21 missing columns on operatives
-- Date: 2026-03-13

-- ============================================================
-- 1. ENUMS (create if not exist)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE operative_entry_source AS ENUM ('manual', 'import', 'sophie', 'referral', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engagement_method AS ENUM ('self_employed', 'cis_sole_trader', 'limited_company', 'agency', 'direct_paye');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trade_skill_level AS ENUM ('trainee', 'competent', 'skilled', 'advanced', 'expert');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_run_status AS ENUM ('active', 'paused', 'completed', 'cancelled', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_target_status AS ENUM ('pending', 'contacted', 'responded', 'completed', 'failed', 'timed_out', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add 'telegram' to message_channel if missing
DO $$ BEGIN
  ALTER TYPE message_channel ADD VALUE IF NOT EXISTS 'telegram';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- 2. NEW TABLES
-- ============================================================

-- 2a. agencies
CREATE TABLE IF NOT EXISTS public.agencies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id),
  name             TEXT NOT NULL,
  contact_name     TEXT,
  contact_email    TEXT,
  contact_phone    TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agencies_org ON agencies(organization_id);
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.agencies FOR ALL USING (organization_id = get_user_org_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2b. email_integrations
CREATE TABLE IF NOT EXISTS public.email_integrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id),
  provider         TEXT NOT NULL DEFAULT 'microsoft',
  email_address    TEXT NOT NULL,
  display_name     TEXT,
  access_token     TEXT NOT NULL,
  refresh_token    TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_integrations_org ON email_integrations(organization_id);
ALTER TABLE public.email_integrations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.email_integrations FOR ALL USING (organization_id = get_user_org_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2c. email_log
CREATE TABLE IF NOT EXISTS public.email_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id),
  template         TEXT NOT NULL,
  subject          TEXT NOT NULL,
  to_email         TEXT NOT NULL,
  to_name          TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  error            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_log_org ON email_log(organization_id);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.email_log FOR ALL USING (organization_id = get_user_org_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2d. email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id),
  template_key     TEXT NOT NULL,
  subject          TEXT NOT NULL,
  body_html        TEXT NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, template_key)
);
CREATE INDEX IF NOT EXISTS idx_email_templates_org ON email_templates(organization_id);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.email_templates FOR ALL USING (organization_id = get_user_org_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2e. import_logs
CREATE TABLE IF NOT EXISTS public.import_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id),
  imported_by      UUID NOT NULL REFERENCES public.users(id),
  filename         TEXT NOT NULL,
  total_rows       INTEGER NOT NULL,
  created_count    INTEGER NOT NULL DEFAULT 0,
  skipped_count    INTEGER NOT NULL DEFAULT 0,
  failed_count     INTEGER NOT NULL DEFAULT 0,
  errors           JSONB,
  skipped_rows     JSONB,
  warned_rows      JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_import_logs_org ON import_logs(organization_id);
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.import_logs FOR ALL USING (organization_id = get_user_org_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2f. operative_cscs_cards
CREATE TABLE IF NOT EXISTS public.operative_cscs_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operative_id     UUID NOT NULL REFERENCES public.operatives(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id),
  card_type        cscs_card_type NOT NULL,
  card_number      TEXT,
  card_title       TEXT,
  card_description TEXT,
  scheme           TEXT,
  expiry_date      DATE,
  is_primary       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cscs_cards_operative ON operative_cscs_cards(operative_id);
CREATE INDEX IF NOT EXISTS idx_cscs_cards_org ON operative_cscs_cards(organization_id);
ALTER TABLE public.operative_cscs_cards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.operative_cscs_cards FOR ALL USING (organization_id = get_user_org_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2g. operative_pay_rates
CREATE TABLE IF NOT EXISTS public.operative_pay_rates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operative_id             UUID NOT NULL REFERENCES public.operatives(id) ON DELETE CASCADE,
  organization_id          UUID NOT NULL REFERENCES public.organizations(id),
  day_rate                 DECIMAL(8,2) NOT NULL,
  hourly_rate              DECIMAL(8,2),
  rate_type                TEXT NOT NULL,
  grade                    TEXT,
  quartile                 TEXT,
  effective_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_duration_weeks  INTEGER,
  rationale                TEXT,
  notes                    TEXT,
  changed_by               UUID REFERENCES public.users(id),
  created_at               TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pay_rates_operative ON operative_pay_rates(operative_id);
CREATE INDEX IF NOT EXISTS idx_pay_rates_org ON operative_pay_rates(organization_id);
ALTER TABLE public.operative_pay_rates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.operative_pay_rates FOR ALL USING (organization_id = get_user_org_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2h. operative_trades
CREATE TABLE IF NOT EXISTS public.operative_trades (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operative_id       UUID NOT NULL REFERENCES public.operatives(id) ON DELETE CASCADE,
  organization_id    UUID NOT NULL REFERENCES public.organizations(id),
  trade_category_id  UUID NOT NULL REFERENCES public.trade_categories(id),
  skill_level        trade_skill_level,
  is_primary         BOOLEAN NOT NULL DEFAULT false,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_op_trades_operative ON operative_trades(operative_id);
CREATE INDEX IF NOT EXISTS idx_op_trades_org ON operative_trades(organization_id);
CREATE INDEX IF NOT EXISTS idx_op_trades_category ON operative_trades(trade_category_id);
ALTER TABLE public.operative_trades ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.operative_trades FOR ALL USING (organization_id = get_user_org_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2i. work_history
CREATE TABLE IF NOT EXISTS public.work_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operative_id     UUID NOT NULL REFERENCES public.operatives(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES public.organizations(id),
  job_title        TEXT NOT NULL,
  employer         TEXT,
  description      TEXT,
  start_date       DATE,
  end_date         DATE,
  source           TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_history_operative ON work_history(operative_id);
CREATE INDEX IF NOT EXISTS idx_work_history_org ON work_history(organization_id);
ALTER TABLE public.work_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.work_history FOR ALL USING (organization_id = get_user_org_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2j. workflow_runs
CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id),
  workflow_type       TEXT NOT NULL,
  status              workflow_run_status NOT NULL DEFAULT 'active',
  triggered_by        TEXT NOT NULL DEFAULT 'alf',
  triggered_by_user   UUID REFERENCES public.users(id),
  conversation_id     UUID,
  config              JSONB NOT NULL DEFAULT '{}',
  channel             TEXT NOT NULL DEFAULT 'whatsapp',
  follow_up_hours     INTEGER NOT NULL DEFAULT 24,
  max_follow_ups      INTEGER NOT NULL DEFAULT 2,
  total_targets       INTEGER NOT NULL DEFAULT 0,
  targets_contacted   INTEGER NOT NULL DEFAULT 0,
  targets_responded   INTEGER NOT NULL DEFAULT 0,
  targets_completed   INTEGER NOT NULL DEFAULT 0,
  targets_failed      INTEGER NOT NULL DEFAULT 0,
  site_id             UUID REFERENCES public.sites(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wf_runs_org_status ON workflow_runs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_runs_active ON workflow_runs(status) WHERE status = 'active';
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.workflow_runs FOR ALL USING (organization_id = get_user_org_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2k. workflow_targets (depends on workflow_runs)
CREATE TABLE IF NOT EXISTS public.workflow_targets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  operative_id        UUID NOT NULL REFERENCES public.operatives(id),
  status              workflow_target_status NOT NULL DEFAULT 'pending',
  data                JSONB NOT NULL DEFAULT '{}',
  messages_sent       INTEGER NOT NULL DEFAULT 0,
  last_contacted_at   TIMESTAMPTZ,
  next_follow_up_at   TIMESTAMPTZ,
  response_text       TEXT,
  response_at         TIMESTAMPTZ,
  outcome             TEXT,
  engagement_state    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_run_id, operative_id)
);
CREATE INDEX IF NOT EXISTS idx_wf_targets_run ON workflow_targets(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_wf_targets_operative ON workflow_targets(operative_id);
CREATE INDEX IF NOT EXISTS idx_wf_targets_follow_up ON workflow_targets(next_follow_up_at)
  WHERE status IN ('contacted', 'pending');

-- engagement_state constraint
DO $$ BEGIN
  ALTER TABLE workflow_targets
    ADD CONSTRAINT chk_engagement_state
    CHECK (engagement_state IS NULL OR engagement_state IN ('re_engaged', 'engaged'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.workflow_targets ENABLE ROW LEVEL SECURITY;
-- workflow_targets doesn't have org_id directly, access through workflow_runs
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.workflow_targets FOR ALL
    USING (workflow_run_id IN (SELECT id FROM workflow_runs WHERE organization_id = get_user_org_id()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2l. workflow_events (depends on workflow_runs + workflow_targets)
CREATE TABLE IF NOT EXISTS public.workflow_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  target_id           UUID REFERENCES public.workflow_targets(id),
  event_type          TEXT NOT NULL,
  data                JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wf_events_run ON workflow_events(workflow_run_id, created_at);
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "org_isolation" ON public.workflow_events FOR ALL
    USING (workflow_run_id IN (SELECT id FROM workflow_runs WHERE organization_id = get_user_org_id()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2m. Add active_workflow_id to message_threads
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS active_workflow_id UUID REFERENCES public.workflow_runs(id);


-- ============================================================
-- 3. VIEWS
-- ============================================================

-- 3a. operative_last_worked (VIEW — derived from allocations)
CREATE OR REPLACE VIEW public.operative_last_worked AS
SELECT
  a.operative_id,
  a.organization_id,
  MAX(COALESCE(a.actual_end_date, a.end_date))::DATE AS last_worked_date,
  COUNT(*)::INTEGER AS completed_allocations
FROM public.allocations a
WHERE a.status IN ('completed', 'active')
GROUP BY a.operative_id, a.organization_id;

-- 3b. operative_rap_summary (VIEW — derived from performance_reviews)
CREATE OR REPLACE VIEW public.operative_rap_summary AS
SELECT
  pr.operative_id,
  pr.organization_id,
  ROUND(AVG(pr.reliability_score)::DECIMAL, 1) AS avg_reliability,
  ROUND(AVG(pr.attitude_score)::DECIMAL, 1) AS avg_attitude,
  ROUND(AVG(pr.performance_score)::DECIMAL, 1) AS avg_performance,
  ROUND(AVG(pr.rap_average)::DECIMAL, 1) AS avg_composite,
  COUNT(*)::INTEGER AS review_count,
  MAX(pr.created_at) AS latest_review_at
FROM public.performance_reviews pr
GROUP BY pr.operative_id, pr.organization_id;


-- ============================================================
-- 4. MISSING COLUMNS ON OPERATIVES
-- ============================================================

ALTER TABLE public.operatives
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id),
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS compliance_alert TEXT,
  ADD COLUMN IF NOT EXISTS cv_summary TEXT,
  ADD COLUMN IF NOT EXISTS data_completeness_score INTEGER,
  ADD COLUMN IF NOT EXISTS engagement_method engagement_method,
  ADD COLUMN IF NOT EXISTS entry_source operative_entry_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS gov_rtw_checked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gov_rtw_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS has_verified_photo_id BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_verified_rtw BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_document_number TEXT,
  ADD COLUMN IF NOT EXISTS id_expiry DATE,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_upload_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS min_acceptable_rate DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS other_certifications TEXT,
  ADD COLUMN IF NOT EXISTS rate_status TEXT,
  ADD COLUMN IF NOT EXISTS trading_name TEXT;

-- Index for agency lookups
CREATE INDEX IF NOT EXISTS idx_operatives_agency ON operatives(agency_id) WHERE agency_id IS NOT NULL;

-- Index for entry_source filtering
CREATE INDEX IF NOT EXISTS idx_operatives_entry_source ON operatives(entry_source);


-- ============================================================
-- 5. HELPER FUNCTIONS (from Aztec)
-- ============================================================

-- Atomic increment for workflow targets_completed (race condition fix)
CREATE OR REPLACE FUNCTION increment_targets_completed(run_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE workflow_runs
  SET targets_completed = targets_completed + 1,
      updated_at = NOW()
  WHERE id = run_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- DONE
-- ============================================================
