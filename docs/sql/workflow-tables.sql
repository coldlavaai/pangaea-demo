-- ALF Workflow Engine — Database Migration
-- Run in Supabase SQL editor (Production + Local)
-- Created: 2026-03-10

-- ============================================================
-- 1. Enums
-- ============================================================

CREATE TYPE workflow_run_status AS ENUM (
  'active', 'paused', 'completed', 'cancelled', 'failed'
);

CREATE TYPE workflow_target_status AS ENUM (
  'pending', 'contacted', 'responded', 'completed', 'failed', 'timed_out', 'skipped'
);

-- ============================================================
-- 2. workflow_runs — one row per campaign
-- ============================================================

CREATE TABLE workflow_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  workflow_type       TEXT NOT NULL,
  status              workflow_run_status NOT NULL DEFAULT 'active',
  triggered_by        TEXT NOT NULL DEFAULT 'alf',   -- alf | cron | manual
  triggered_by_user   UUID REFERENCES users(id),
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
  site_id             UUID REFERENCES sites(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_wf_runs_org_status ON workflow_runs(organization_id, status);
CREATE INDEX idx_wf_runs_active ON workflow_runs(status) WHERE status = 'active';

-- ============================================================
-- 3. workflow_targets — per-operative state within a run
-- ============================================================

CREATE TABLE workflow_targets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  operative_id        UUID NOT NULL REFERENCES operatives(id),
  status              workflow_target_status NOT NULL DEFAULT 'pending',
  data                JSONB NOT NULL DEFAULT '{}',
  messages_sent       INTEGER NOT NULL DEFAULT 0,
  last_contacted_at   TIMESTAMPTZ,
  next_follow_up_at   TIMESTAMPTZ,
  response_text       TEXT,
  response_at         TIMESTAMPTZ,
  outcome             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_run_id, operative_id)
);

CREATE INDEX idx_wf_targets_run ON workflow_targets(workflow_run_id);
CREATE INDEX idx_wf_targets_operative ON workflow_targets(operative_id);
CREATE INDEX idx_wf_targets_follow_up ON workflow_targets(next_follow_up_at)
  WHERE status IN ('contacted', 'pending');

-- ============================================================
-- 4. workflow_events — audit log
-- ============================================================

CREATE TABLE workflow_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  target_id           UUID REFERENCES workflow_targets(id),
  event_type          TEXT NOT NULL,
  -- started | message_sent | response_received | document_uploaded |
  -- verified | escalated | timed_out | completed | cancelled | error
  data                JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wf_events_run ON workflow_events(workflow_run_id, created_at);

-- ============================================================
-- 5. ALTER message_threads — add workflow routing column
-- ============================================================

ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS active_workflow_id UUID REFERENCES workflow_runs(id);
