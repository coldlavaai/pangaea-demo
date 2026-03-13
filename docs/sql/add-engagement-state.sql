-- Add engagement_state to workflow_targets
-- Tracks the RE_ENGAGE handshake: null → 're_engaged' → 'engaged'
-- Run in Supabase SQL editor
-- Created: 2026-03-12

ALTER TABLE workflow_targets
  ADD COLUMN IF NOT EXISTS engagement_state TEXT;

-- Optional: check constraint for valid values
ALTER TABLE workflow_targets
  ADD CONSTRAINT chk_engagement_state
  CHECK (engagement_state IS NULL OR engagement_state IN ('re_engaged', 'engaged'));

COMMENT ON COLUMN workflow_targets.engagement_state IS
  'RE_ENGAGE handshake state: null=not started, re_engaged=waiting for reply, engaged=operative active (24h window open)';
