-- Fix missing columns that the WhatsApp handler needs

-- message_threads: missing columns
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS deferred_message TEXT;
ALTER TABLE public.message_threads ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;

-- messages: missing columns
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS body_en TEXT;

-- Unique constraint on message_threads for upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'message_threads_phone_org_unique'
  ) THEN
    ALTER TABLE public.message_threads ADD CONSTRAINT message_threads_phone_org_unique UNIQUE (phone_number, organization_id);
  END IF;
END $$;

-- increment_thread_unread RPC function
CREATE OR REPLACE FUNCTION increment_thread_unread(thread_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE message_threads SET unread_count = unread_count + 1 WHERE id = thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
