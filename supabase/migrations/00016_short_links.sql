-- Migration 00016: Self-hosted URL shortener
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS short_links (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  code        VARCHAR(12) UNIQUE NOT NULL,
  target_url  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  clicks      INT         DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links (code);

-- No RLS needed — this table is only accessed via service role (server-side redirects)
