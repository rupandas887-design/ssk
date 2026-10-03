# Supabase Database Setup & Architecture Guide

This document describes the complete architecture, setup instructions, table schemas, and troubleshooting guidelines for the **SSK Samaj Registry Network**.

---

## 1. Project Credentials

- **Live Supabase Project URL:** `https://baetdjjzfqupdzsoecph.supabase.co`
- **Anon / Public Key:** Available in `.env.example` and `supabase/client.ts`
- **Authentication Providers:** Email + Password enabled

---

## 2. Database Schema Overview

The application relies on three core relational tables and one storage bucket:

### Table: `organisations`
Stores participating community organization branches and regional nodal hubs.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, `DEFAULT gen_random_uuid()` | Unique organisation ID |
| `name` | `TEXT` | `NOT NULL` | Branch / Organisation name |
| `secretary_name` | `TEXT` | `NOT NULL` | Name of Secretary / Head |
| `mobile` | `TEXT` | `NOT NULL` | 10-digit mobile contact |
| `status` | `TEXT` | `DEFAULT 'Active'`, CHECK ('Active','Deactivated') | Operational status |
| `profile_photo_url`| `TEXT` | Nullable | Logo or photo URL |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Record creation timestamp |

---

### Table: `profiles`
Maps user identities from `auth.users` to app-specific roles, permissions, and organizations.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, `REFERENCES auth.users(id) ON DELETE CASCADE` | Matches Supabase Auth user UUID |
| `name` | `TEXT` | `NOT NULL` | Full Name |
| `email` | `TEXT` | `NOT NULL UNIQUE` | Login email |
| `mobile` | `TEXT` | Nullable | 10-digit contact mobile |
| `role` | `TEXT` | CHECK in (`MasterAdmin`, `Organisation`, `Volunteer`, `MemberUpdates`) | Role for route authorization |
| `organisation_id` | `UUID` | Nullable, `REFERENCES organisations(id)` | Parent organisation node |
| `status` | `TEXT` | `DEFAULT 'Active'` | Operational status |
| `password_reset_pending` | `BOOLEAN` | `DEFAULT false` | Flag indicating mandatory password change |
| `profile_photo_url` | `TEXT` | Nullable | Volunteer or Admin avatar URL |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Creation timestamp |

---

### Table: `members`
The primary community registry database containing verified citizen records.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | Primary Key, `DEFAULT gen_random_uuid()` | Unique member record ID |
| `aadhaar` | `VARCHAR(12)` | `NOT NULL` | 12-digit Aadhaar / National ID |
| `mobile` | `VARCHAR(15)` | `NOT NULL` | Primary contact number |
| `name` | `TEXT` | `NOT NULL` | First / Given Name |
| `surname` | `TEXT` | `NOT NULL` | Gharano / Family Surname |
| `father_name` | `TEXT` | `NOT NULL` | Father / Guardian / Husband |
| `dob` | `DATE` | `NOT NULL` | Date of Birth |
| `gender` | `TEXT` | `NOT NULL` | Male, Female, Other |
| `marital_status`| `TEXT` | `DEFAULT 'Single'` | Single, Married, Divorced, etc. |
| `qualification` | `TEXT` | `DEFAULT 'Graduate'` | Highest educational qualification |
| `occupation` | `TEXT` | `DEFAULT 'Employee / Job'` | Career / Vocation |
| `support_need` | `TEXT` | `DEFAULT 'Education'` | Priority assistance category |
| `emergency_contact` | `VARCHAR(15)` | `NOT NULL` | Emergency phone number |
| `pincode` | `VARCHAR(10)` | `NOT NULL` | Postal code |
| `address` | `TEXT` | `NOT NULL` | Full residential address |
| `previous_address` | `TEXT` | Nullable | Previous address if relocated |
| `member_image_url` | `TEXT` | Nullable | Applicant portrait URL |
| `aadhaar_front_url` | `TEXT` | Nullable | Aadhaar front scan URL |
| `aadhaar_back_url` | `TEXT` | Nullable | Aadhaar back scan URL |
| `address_proof_url` | `TEXT` | Nullable | Address proof document URL |
| `death_certificate_url` | `TEXT` | Nullable | Supporting certificate URL |
| `volunteer_id` | `UUID` | `REFERENCES profiles(id)` | Enrolling volunteer |
| `organisation_id`| `UUID` | `REFERENCES organisations(id)` | Enrolling organisation node |
| `submission_date`| `DATE` | `DEFAULT CURRENT_DATE` | Date registered |
| `status` | `TEXT` | `DEFAULT 'Pending'`, CHECK ('Pending', 'Accepted', 'Rejected') | Audit & verification state |
| `auth_user_id` | `UUID` | Nullable, `REFERENCES auth.users(id)` | Linked self-service user |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Creation timestamp |

---

### Storage: `member-images` bucket
- **Access Level:** Public read access (`public: true`).
- **Folders / Filenames:**
  - `vol_profile_<uuid>.jpg`
  - `org_profile_<uuid>.jpg`
  - `aadhaar_<uuid>.jpg`
  - `member_<uuid>.jpg`

---

## 3. How to Run Migrations in Supabase

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project: `baetdjjzfqupdzsoecph`.
3. In the left navigation, open **SQL Editor**.
4. Click **New query**.
5. Copy and execute the contents of each file in order:
   - `supabase/migrations/001_initial_schema.sql` (Creates tables and functions)
   - `supabase/migrations/002_rls_policies.sql` (Applies security policies & storage setup)
   - `supabase/migrations/003_indexes.sql` (Creates high-performance indexing)
   - `supabase/migrations/004_seed_data.sql` (Seeds central org and admin roles)
6. Check that the query outputs say `Success. No rows returned`.

---

## 4. Connecting to Vercel Deployments

When deploying this frontend on Vercel:

1. Open your project on the **Vercel Dashboard**.
2. Go to **Settings** → **Environment Variables**.
3. Add the following variables for **Production**, **Preview**, and **Development**:
   - `VITE_SUPABASE_URL` = `https://baetdjjzfqupdzsoecph.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (see `.env.example`)
4. Trigger a new deployment (**Deployments** → **Redeploy**).

---

## 5. Troubleshooting Data Fetching in Production

### Issue 1: Landing Page or Dashboard displays empty lists
- **Cause:** The client attempted to connect through `/supabase-proxy` on Vercel where no Vite dev server proxy exists.
- **Solution:** The updated `supabase/client.ts` now uses `directSupabaseUrl` on production hosts and falls back automatically if any proxy path returns 404.

### Issue 2: "Failed to fetch" or CORS errors
- Verify that your production domain is allowed in the Supabase Dashboard under **Authentication** → **URL Configuration** → **Site URL** and **Redirect URLs**.

### Issue 3: Newly registered volunteers cannot log in
- Check that the volunteer's profile row in `profiles` exists and has `status = 'Active'`.
- If an admin reset a volunteer's password, ensure the RPC function `admin_reset_password` was installed from `001_initial_schema.sql`.
