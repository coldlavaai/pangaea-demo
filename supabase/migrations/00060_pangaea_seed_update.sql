-- Pangaea Demo: Update seed data for Titan Construction demo org

-- Rename existing org from "AZTEC Landscapes" to "Titan Construction"
UPDATE organizations
SET name = 'Titan Construction',
    slug = 'titan-construction',
    settings = jsonb_build_object(
      'reference_prefix', 'TIT',
      'assistant_name', 'Rex',
      'intake_bot_name', 'Amber',
      'company_name', 'Titan Construction'
    )
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Update sample sites to construction projects
UPDATE sites SET
  name = 'Meridian Tower - Phase 2',
  address = '45 Victoria Street, Manchester',
  postcode = 'M3 3HP',
  main_duties = 'Mixed-use commercial and residential development. 14-storey tower with underground parking. Groundworks, concrete frame, and envelope works.'
WHERE organization_id = '00000000-0000-0000-0000-000000000001' AND name = 'Riverside Park Development';

-- Update trade categories for general construction (replace landscaping-specific)
UPDATE trade_categories SET name = 'Groundworker' WHERE name = 'Skilled Landscaper' AND organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE trade_categories SET name = 'Scaffolder', typical_day_rate = 195.00 WHERE name = 'Paver / Kerb Layer' AND organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE trade_categories SET name = 'Plumber', typical_day_rate = 200.00 WHERE name = 'Drainage Operative' AND organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE trade_categories SET name = 'Electrician', typical_day_rate = 210.00 WHERE name = 'Stone Mason' AND organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE trade_categories SET name = 'Plasterer', typical_day_rate = 175.00 WHERE name = 'Fencer' AND organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE trade_categories SET name = 'Roofer', typical_day_rate = 190.00 WHERE name = 'Turfing Operative' AND organization_id = '00000000-0000-0000-0000-000000000001';
UPDATE trade_categories SET name = 'Demolition Operative', typical_day_rate = 185.00 WHERE name = 'Tree Surgeon / Arborist' AND organization_id = '00000000-0000-0000-0000-000000000001';

-- Update handle_new_user() to not hardcode a specific org UUID
-- Instead, assign to the first org (for single-tenant demo) or read from user metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  target_org_id UUID;
BEGIN
  -- Check if org_id is provided in user metadata (for multi-tenant)
  target_org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;

  -- If not provided, use the first (default) org
  IF target_org_id IS NULL THEN
    SELECT id INTO target_org_id FROM public.organizations LIMIT 1;
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
