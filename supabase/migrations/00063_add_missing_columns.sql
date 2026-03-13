-- Add agency_name column to operatives (referenced by form but missing from base schema)
ALTER TABLE public.operatives ADD COLUMN IF NOT EXISTS agency_name TEXT;

-- Add any other columns that might be referenced but missing
ALTER TABLE public.operatives ADD COLUMN IF NOT EXISTS machine_operator BOOLEAN DEFAULT false;
ALTER TABLE public.operatives ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE public.operatives ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
