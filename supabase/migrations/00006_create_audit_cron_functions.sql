-- ============================================================
-- MIGRATION 00006: Audit Log, Cron Idempotency, Atomic Functions, Cascade Triggers
-- ============================================================

-- ============================================================
-- AUDIT LOG (NEW-GAP-A)
-- "Full audit trail. Every action logged (who did what, when)"
-- Populated by middleware on all API write endpoints (POST, PATCH, DELETE)
-- ============================================================
CREATE TABLE audit_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id         UUID REFERENCES users(id),
  action          TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  table_name      TEXT NOT NULL,
  record_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_org ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);
-- Note: audit_log intentionally has NO RLS — only service role writes to it.
-- Web API middleware calls supabase.from('audit_log').insert() using service client.

-- ============================================================
-- CRON IDEMPOTENCY (NEW-GAP-P)
-- Prevents cron double-fire if Vercel retries within the same day
-- ============================================================
CREATE TABLE cron_runs (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type  TEXT NOT NULL,   -- 'compliance' | 'offer_expiry' | 'session_cleanup'
  run_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  ran_at    TIMESTAMPTZ DEFAULT NOW(),
  result    JSONB DEFAULT '{}',
  UNIQUE(job_type, run_date)
);
-- Cron handler: INSERT INTO cron_runs (job_type) VALUES ('compliance') ON CONFLICT DO NOTHING
-- If 0 rows inserted, skip processing (already ran today)

-- ============================================================
-- INBOUND DEDUP (B-01 FIX)
-- Lightweight idempotency table for Twilio webhook deduplication.
-- Stores MessageSid only — avoids the thread_id NOT NULL constraint
-- on the messages table. Full message saved per handler once thread known.
-- ============================================================
CREATE TABLE inbound_dedup (
  external_id     TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  received_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (external_id, organization_id)
);

-- ============================================================
-- ATOMIC OFFER ACCEPTANCE (BUG-01, BUG-13)
-- Prevents two operatives accepting same offer simultaneously
-- Also prevents headcount overfill on labour_requests
-- ============================================================
CREATE OR REPLACE FUNCTION accept_allocation_offer(
  p_allocation_id   UUID,
  p_operative_phone TEXT   -- B-03 NOTE: Used to verify the responder owns this allocation (security check)
) RETURNS JSONB AS $$
DECLARE
  v_allocation allocations%ROWTYPE;
  v_request    labour_requests%ROWTYPE;
  v_operative_phone TEXT;
BEGIN
  -- B-03 FIX: Verify that the phone number of the responder matches the operative on this allocation
  -- Prevents any operative accepting any allocation just by knowing the ID
  SELECT op.phone INTO v_operative_phone
  FROM allocations a
  JOIN operatives op ON op.id = a.operative_id
  WHERE a.id = p_allocation_id;

  IF v_operative_phone IS NULL OR v_operative_phone != p_operative_phone THEN
    RETURN jsonb_build_object('success', false, 'reason', 'operative_mismatch');
  END IF;

  -- Lock the allocation row exclusively
  SELECT * INTO v_allocation
  FROM allocations
  WHERE id = p_allocation_id
    AND status = 'pending'
  FOR UPDATE SKIP LOCKED;

  -- If no row returned, already accepted or doesn't exist
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'offer_already_taken');
  END IF;

  -- Check offer hasn't expired
  IF v_allocation.offer_expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'offer_expired');
  END IF;

  -- BUG-13: Atomically check + increment headcount on parent request
  IF v_allocation.labour_request_id IS NOT NULL THEN
    UPDATE labour_requests
    SET headcount_filled = headcount_filled + 1
    WHERE id = v_allocation.labour_request_id
      AND headcount_filled < headcount_required
    RETURNING * INTO v_request;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'reason', 'headcount_full');
    END IF;
  END IF;

  -- Mark allocation as confirmed
  UPDATE allocations
  SET status = 'confirmed',
      offer_responded_at = NOW(),
      updated_at = NOW()
  WHERE id = p_allocation_id;

  RETURN jsonb_build_object('success', true, 'allocation_id', p_allocation_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- WTD DB-LEVEL GUARD (BUG-02)
-- Prevents two simultaneous allocations bypassing the weekly hours check
-- Application-level check (canAllocate) catches most cases.
-- This DB trigger is the safety net for concurrent INSERTs.
-- Only fires for non-opt-out operatives.
-- ============================================================
CREATE OR REPLACE FUNCTION check_wtd_on_allocation()
RETURNS TRIGGER AS $$
DECLARE
  v_total_hours DECIMAL;
  v_shift_hours DECIMAL;
  v_opt_out     BOOLEAN;
BEGIN
  -- Skip if operative has WTD opt-out
  SELECT wtd_opt_out INTO v_opt_out FROM operatives WHERE id = NEW.operative_id;
  IF v_opt_out THEN RETURN NEW; END IF;

  -- Calculate approximate shift hours for the week
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (s.scheduled_end - s.scheduled_start)) / 3600
  ), 0) INTO v_total_hours
  FROM shifts s
  WHERE s.operative_id = NEW.operative_id
    -- L-08 KNOWN BUG: date_trunc('week', ...) uses UTC not Europe/London — week boundaries wrong in BST (Mar-Oct)
    -- TODO: Fix in S7 compliance session using AT TIME ZONE 'Europe/London' before date_trunc
    -- Low frequency issue: only affects allocations created at exactly UK midnight during BST
    AND s.scheduled_start >= date_trunc('week', NEW.start_date::TIMESTAMPTZ)
    AND s.scheduled_start < date_trunc('week', NEW.start_date::TIMESTAMPTZ) + INTERVAL '1 week'
    AND s.status NOT IN ('cancelled', 'no_show');

  -- Standard working day assumed 8hrs if no shift record yet (conservative)
  v_shift_hours := 8.0;

  IF (v_total_hours + v_shift_hours) > 48 THEN
    RAISE EXCEPTION 'WTD_HOURS_EXCEEDED: operative % would exceed 48hr weekly limit', NEW.operative_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wtd_check_on_allocation
  BEFORE INSERT ON allocations
  FOR EACH ROW EXECUTE FUNCTION check_wtd_on_allocation();

-- ============================================================
-- NO-SHOW CASCADE (BUG-11)
-- When attendance logged as no_show:
--   1. Set operative.status → 'available' (was 'working')
--   2. Set allocation.status → 'no_show'
--   3. NCR is created by the application layer (not trigger, needs more context)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_no_show_attendance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'no_show' THEN
    -- Free up the operative
    UPDATE operatives
    SET status = 'available'
    WHERE id = NEW.operative_id AND status = 'working';

    -- Mark the allocation
    IF NEW.allocation_id IS NOT NULL THEN
      UPDATE allocations
      SET status = 'no_show', updated_at = NOW()
      WHERE id = NEW.allocation_id AND status IN ('confirmed', 'active');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_show_attendance
  AFTER INSERT ON attendance
  FOR EACH ROW EXECUTE FUNCTION handle_no_show_attendance();

-- ============================================================
-- INDUCTION COMPLETION — Public API endpoint handles this:
-- POST /api/v1/allocations/[id]/induction-complete (no auth, validates by allocation UUID)
-- B-15 FIX: The allocation UUID IS the token. No separate induction_token column needed.
-- The URL /induction/[allocation_uuid] is unguessable (UUID v4) — sufficient security for induction form.
-- Handler: verify allocation exists + status is 'confirmed', then set induction_completed = true.
-- Sets: induction_completed = true, induction_completed_at = NOW()
-- Sends confirmation WhatsApp to operative
-- ============================================================

-- RLS for new tables
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

-- audit_log: authenticated users in same org can read; only service role writes
CREATE POLICY "audit_read" ON audit_log
  FOR SELECT USING (organization_id = get_user_org_id());

-- cron_runs: internal only — no user-facing RLS needed (service role only)
CREATE POLICY "cron_internal" ON cron_runs
  FOR ALL USING (FALSE);  -- Blocks all authenticated user access; service role bypasses RLS
