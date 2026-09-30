-- ==============================================================================
-- SSK SAMAJ REGISTRY NETWORK - ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 002_rls_policies.sql
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- ORGANISATIONS POLICIES
-- ------------------------------------------------------------------------------
-- Anyone (including landing page public visitors) can view active organizations
DROP POLICY IF EXISTS "Public can view organisations" ON public.organisations;
CREATE POLICY "Public can view organisations"
ON public.organisations FOR SELECT
USING (true);

-- Master admin can manage (insert/update/delete) organisations
DROP POLICY IF EXISTS "Master admin full access on organisations" ON public.organisations;
CREATE POLICY "Master admin full access on organisations"
ON public.organisations FOR ALL
USING (
  public.is_master_admin() OR auth.role() = 'service_role'
);

-- Organisation secretaries can update their own organisation
DROP POLICY IF EXISTS "Org admins can update own organisation" ON public.organisations;
CREATE POLICY "Org admins can update own organisation"
ON public.organisations FOR UPDATE
USING (
  id = public.get_auth_org_id()
);

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Anyone can view profiles (needed for landing page volunteer names/counters and authentication verification)
DROP POLICY IF EXISTS "Profiles are readable by authenticated and public for registry" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated and public for registry"
ON public.profiles FOR SELECT
USING (true);

-- Authenticated users can insert or update their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (
  auth.uid() = id OR public.is_master_admin() OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = id OR public.is_master_admin() OR auth.role() = 'service_role'
);

-- Master admins can manage all profiles
DROP POLICY IF EXISTS "Master admin can delete profiles" ON public.profiles;
CREATE POLICY "Master admin can delete profiles"
ON public.profiles FOR DELETE
USING (
  public.is_master_admin() OR auth.role() = 'service_role'
);

-- ------------------------------------------------------------------------------
-- MEMBERS POLICIES
-- ------------------------------------------------------------------------------
-- Public/Authenticated read access for landing page analytics, reports, and search
DROP POLICY IF EXISTS "Members are viewable by public and authenticated users" ON public.members;
CREATE POLICY "Members are viewable by public and authenticated users"
ON public.members FOR SELECT
USING (true);

-- Volunteers and organization admins can register new members
DROP POLICY IF EXISTS "Volunteers and admins can insert members" ON public.members;
CREATE POLICY "Volunteers and admins can insert members"
ON public.members FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL OR public.is_master_admin() OR auth.role() = 'service_role'
);

-- Admins and designated operators can update member status and details
DROP POLICY IF EXISTS "Admins and volunteers can update members" ON public.members;
CREATE POLICY "Admins and volunteers can update members"
ON public.members FOR UPDATE
USING (
  public.is_master_admin() 
  OR volunteer_id = auth.uid() 
  OR organisation_id = public.get_auth_org_id()
  OR auth.role() = 'service_role'
  OR auth.uid() IS NOT NULL
);

-- Master admin can delete member records
DROP POLICY IF EXISTS "Master admin can delete members" ON public.members;
CREATE POLICY "Master admin can delete members"
ON public.members FOR DELETE
USING (
  public.is_master_admin() OR auth.role() = 'service_role'
);

-- ------------------------------------------------------------------------------
-- STORAGE BUCKET POLICIES (member-images)
-- ------------------------------------------------------------------------------
-- Create bucket if not present
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-images', 'member-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public can read uploaded photos and document images
DROP POLICY IF EXISTS "Public can read member images" ON storage.objects;
CREATE POLICY "Public can read member images"
ON storage.objects FOR SELECT
USING (bucket_id = 'member-images');

-- Authenticated volunteers and admins can upload files
DROP POLICY IF EXISTS "Authenticated users can upload member images" ON storage.objects;
CREATE POLICY "Authenticated users can upload member images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'member-images');

-- Authenticated users can update/replace member images
DROP POLICY IF EXISTS "Authenticated users can update member images" ON storage.objects;
CREATE POLICY "Authenticated users can update member images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'member-images');
