-- Migration 00008: Fix rtw_type CHECK constraint
-- The original constraint only allowed 4 values that did not match the application's RTW type list.
-- Also removes 'passport' (replaced by 'british_citizen'/'irish_citizen') and adds all current values.

ALTER TABLE public.operatives DROP CONSTRAINT IF EXISTS operatives_rtw_type_check;

ALTER TABLE public.operatives ADD CONSTRAINT operatives_rtw_type_check
  CHECK (rtw_type IN (
    'british_citizen',
    'irish_citizen',
    'eu_settled_status',
    'eu_pre_settled_status',
    'share_code',
    'biometric_residence_permit',
    'work_visa',
    'other'
  ));
