-- Migration 00031: Add telegram to message_channel enum
-- IMPORTANT: ALTER TYPE ADD VALUE must be run in its own transaction in Supabase SQL editor
-- Run this statement alone (not with other SQL)

ALTER TYPE public.message_channel ADD VALUE IF NOT EXISTS 'telegram';
