-- Add body_en column to messages for English translations
-- body = what was actually sent/received (native language)
-- body_en = English translation (for staff to read)
-- Run in Supabase SQL editor
-- Created: 2026-03-12

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS body_en TEXT;

COMMENT ON COLUMN messages.body_en IS
  'English translation of body (populated when message is in a non-English language). Staff-facing.';
