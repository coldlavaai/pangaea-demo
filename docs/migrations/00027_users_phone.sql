-- Migration 00027: Add phone_number to public.users
-- Run in Supabase SQL editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_number varchar(20);

CREATE INDEX IF NOT EXISTS users_phone_number_idx ON users(phone_number);
