-- Migration 00033: Notification preferences + enhanced notifications
-- Run in Supabase SQL editor

-- Add link_url to notifications table for click-through navigation
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_url text;

-- Add ncr_id FK for NCR-specific notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS ncr_id uuid REFERENCES public.non_conformance_incidents(id) ON DELETE SET NULL;

-- Add receive_notifications to users — controls Telegram DM push (defaults true so existing users opt in)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS receive_notifications boolean NOT NULL DEFAULT true;

-- Enable Supabase Realtime on notifications so AlertsBell gets live badge updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
