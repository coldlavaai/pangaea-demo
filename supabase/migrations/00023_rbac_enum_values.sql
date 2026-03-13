-- Add new enum values (must be in separate transaction from usage)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'site_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'auditor';
