-- ==============================================================================
-- SSK SAMAJ REGISTRY NETWORK - REFERENCE & SEED DATA
-- Migration: 004_seed_data.sql
-- ==============================================================================

-- 1. Ensure Default Master Organisation Exists
INSERT INTO public.organisations (id, name, secretary_name, mobile, status, profile_photo_url)
VALUES (
    '79079541-1d21-49be-86ad-13e1992a8e44',
    'SSK People Central Hub',
    'Sunil S.R',
    '9844955100',
    'Active',
    NULL
)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    secretary_name = EXCLUDED.secretary_name,
    mobile = EXCLUDED.mobile;

-- 2. Ensure Master Admin Profile Exists
-- Note: In Supabase, the corresponding auth user is created via Supabase Auth Dashboard or Login.
-- When auth user 'masteradmin@ssk.com' registers or logs in, their profile maps to this row.
DO $$
DECLARE
  v_master_id UUID;
BEGIN
  -- Look for existing masteradmin in auth.users
  SELECT id INTO v_master_id FROM auth.users WHERE email = 'masteradmin@ssk.com' LIMIT 1;
  
  IF v_master_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, email, role, status, password_reset_pending)
    VALUES (
      v_master_id,
      'Master Administrator',
      'masteradmin@ssk.com',
      'MasterAdmin',
      'Active',
      false
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'MasterAdmin',
        status = 'Active';
  END IF;
END $$;
