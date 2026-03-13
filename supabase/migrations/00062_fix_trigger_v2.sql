-- Fix handle_new_user trigger v2
-- Issue: role text needs explicit cast to user_role enum
-- Also: custom_access_token_hook might fail on lookup before user row exists
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, organization_id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000001'::uuid,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Admin'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    NEW.email,
    'admin'::user_role
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't block signup
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix custom_access_token_hook to handle missing user gracefully
-- The hook looks up user by event->>'user_id' but our users table uses auth_user_id
-- The original hook uses id (public.users.id) but the event passes auth.users.id
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims    JSONB;
  found_role TEXT;
BEGIN
  -- Look up by auth_user_id (which maps to auth.users.id passed in event)
  SELECT role::text INTO found_role
  FROM public.users
  WHERE auth_user_id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF found_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(found_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"admin"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
