-- Migration 00028: Language detection for Sophie multi-language support
-- Run in Supabase SQL editor

ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS language varchar(5) DEFAULT 'en';
