-- ==============================================================================
-- SSK SAMAJ REGISTRY NETWORK - INITIAL DATABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS public.organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    secretary_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Deactivated')),
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Profiles Table (extends auth.users with app-specific roles & info)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mobile TEXT,
    role TEXT NOT NULL DEFAULT 'Volunteer' CHECK (role IN ('MasterAdmin', 'Organisation', 'Volunteer', 'MemberUpdates')),
    organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Deactivated')),
    password_reset_pending BOOLEAN NOT NULL DEFAULT false,
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Members Table (Central community registry)
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aadhaar VARCHAR(12) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    father_name TEXT NOT NULL,
    dob DATE NOT NULL,
    gender TEXT NOT NULL,
    marital_status TEXT NOT NULL DEFAULT 'Single',
    qualification TEXT NOT NULL DEFAULT 'Graduate',
    occupation TEXT NOT NULL DEFAULT 'Employee / Job',
    support_need TEXT NOT NULL DEFAULT 'Education',
    emergency_contact VARCHAR(15) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    address TEXT NOT NULL,
    previous_address TEXT,
    member_image_url TEXT,
    aadhaar_front_url TEXT,
    aadhaar_back_url TEXT,
    address_proof_url TEXT,
    death_certificate_url TEXT,
    volunteer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Helper Function: Check if user is MasterAdmin
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'MasterAdmin'
      AND status = 'Active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper Function: Get organization ID for current auth user
CREATE OR REPLACE FUNCTION public.get_auth_org_id()
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT organisation_id INTO v_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Password Reset RPC for Admins
CREATE OR REPLACE FUNCTION public.admin_reset_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
BEGIN
  -- Verify caller is master admin or organisation secretary
  IF NOT (public.is_master_admin() OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('MasterAdmin', 'Organisation')
  )) THEN
    RAISE EXCEPTION 'Unauthorized to reset user password';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = target_user_id;

  UPDATE public.profiles
  SET password_reset_pending = false
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
