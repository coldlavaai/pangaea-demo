-- Migration 00026: Induction columns on allocations
-- Run in Supabase SQL editor

ALTER TABLE allocations
  ADD COLUMN IF NOT EXISTS induction_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS induction_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS induction_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS induction_data jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS allocations_induction_token_idx
  ON allocations(induction_token);
