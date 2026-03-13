-- Fix handle_new_user trigger - use simple approach with hardcoded default org
-- The dynamic SELECT was failing in the trigger context
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  target_org_id UUID;
BEGIN
  -- Check if org_id is provided in user metadata (for multi-tenant signup)
  IF NEW.raw_user_meta_data ? 'organization_id' THEN
    target_org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
  ELSE
    -- Default to first org (Titan Construction demo)
    target_org_id := '00000000-0000-0000-0000-000000000001';
  END IF;

  INSERT INTO public.users (auth_user_id, organization_id, first_name, last_name, email, role)
  VALUES (
    NEW.id,
    target_org_id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Admin'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
