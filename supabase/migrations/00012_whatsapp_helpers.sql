-- S22: WhatsApp webhook helper functions

-- Atomic increment for thread unread count
-- Called from the webhook handler after storing each inbound message
CREATE OR REPLACE FUNCTION increment_thread_unread(thread_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE message_threads
  SET unread_count = unread_count + 1
  WHERE id = thread_id;
$$;
