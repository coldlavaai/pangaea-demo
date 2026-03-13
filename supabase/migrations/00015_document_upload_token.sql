-- Migration 00015: document upload token on operatives
-- Supports the secure link-based document upload flow (replacing WhatsApp photo collection)

ALTER TABLE public.operatives
  ADD COLUMN IF NOT EXISTS document_upload_token        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS document_upload_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS operatives_upload_token_idx
  ON public.operatives(document_upload_token)
  WHERE document_upload_token IS NOT NULL;
