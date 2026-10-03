-- ==============================================================================
-- SSK SAMAJ REGISTRY NETWORK - PERFORMANCE INDEXES
-- Migration: 003_indexes.sql
-- ==============================================================================

-- Members table lookup indexes
CREATE INDEX IF NOT EXISTS idx_members_aadhaar ON public.members(aadhaar);
CREATE INDEX IF NOT EXISTS idx_members_mobile ON public.members(mobile);
CREATE INDEX IF NOT EXISTS idx_members_name_surname ON public.members(name, surname);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON public.members(organisation_id);
CREATE INDEX IF NOT EXISTS idx_members_volunteer_id ON public.members(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_occupation ON public.members(occupation);
CREATE INDEX IF NOT EXISTS idx_members_support_need ON public.members(support_need);
CREATE INDEX IF NOT EXISTS idx_members_gender ON public.members(gender);
CREATE INDEX IF NOT EXISTS idx_members_submission_date ON public.members(submission_date DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_mobile ON public.profiles(mobile);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organisation_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Organisations table indexes
CREATE INDEX IF NOT EXISTS idx_organisations_name ON public.organisations(name);
CREATE INDEX IF NOT EXISTS idx_organisations_status ON public.organisations(status);
