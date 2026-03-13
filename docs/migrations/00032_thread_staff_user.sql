-- Migration 00032: Add staff_user_id to message_threads (for Telegram staff conversations)
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS staff_user_id uuid REFERENCES public.users(id);

-- Index for lookups
CREATE INDEX IF NOT EXISTS message_threads_staff_user_id_idx ON public.message_threads(staff_user_id);
