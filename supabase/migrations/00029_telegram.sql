-- Migration 00029: Telegram bot support
-- Adds telegram_chat_id to users table for site manager bot identity linking
-- Updates CHECK constraints to allow 'telegram' as a channel value

-- 1. Add telegram_chat_id to users (links a BOS user to their Telegram account)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS telegram_chat_id bigint NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_chat_id_idx
  ON public.users (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- 2. Update performance_reviews.submitted_via CHECK to include 'telegram'
--    (current constraint only allows 'web' and 'whatsapp')
ALTER TABLE public.performance_reviews
  DROP CONSTRAINT IF EXISTS performance_reviews_submitted_via_check;

ALTER TABLE public.performance_reviews
  ADD CONSTRAINT performance_reviews_submitted_via_check
  CHECK (submitted_via IN ('web', 'whatsapp', 'telegram'));

-- 3. Update non_conformance_incidents.reported_via if a CHECK constraint exists
--    (drop and recreate to be safe — no-op if constraint didn't exist)
ALTER TABLE public.non_conformance_incidents
  DROP CONSTRAINT IF EXISTS non_conformance_incidents_reported_via_check;

ALTER TABLE public.non_conformance_incidents
  ADD CONSTRAINT non_conformance_incidents_reported_via_check
  CHECK (reported_via IN ('web', 'whatsapp', 'telegram'));
