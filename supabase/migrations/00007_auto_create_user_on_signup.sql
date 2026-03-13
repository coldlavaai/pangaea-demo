-- Migration 00007: Auto-create public.users record on auth signup
-- Ported from JJ's fix (jjs-aztec-bos migration 00007)
--
-- Without this, get_user_org_id() returns NULL for any authenticated user
-- who doesn't have a row in public.users, causing all RLS policies to fail.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, organization_id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000001',
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Admin'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    NEW.email,
    'admin'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Backfill any existing auth users who lack a public.users record
INSERT INTO public.users (auth_user_id, organization_id, first_name, last_name, email, role)
SELECT
  id,
  '00000000-0000-0000-0000-000000000001',
  COALESCE(raw_user_meta_data->>'first_name', 'Admin'),
  COALESCE(raw_user_meta_data->>'last_name', 'User'),
  email,
  'admin'
FROM auth.users
ON CONFLICT (auth_user_id) DO NOTHING;
