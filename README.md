
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SSK People - Membership Management Platform

This is a full-stack application designed to manage the membership drive for the SSK People community, featuring role-based access for Master Admins, Organizations, and Field Agents. It is powered by React on the frontend and Supabase for the database, authentication, and storage.

## 🚨 Critical: Database Schema Updates

If you are experiencing issues with identity uploads, organisation profile photos, or security resets, you must run these commands in your **Supabase SQL Editor**.

### 1. Database Schema Fixes
```sql
-- Identity Document Columns for Members
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS aadhaar_front_url TEXT,
ADD COLUMN IF NOT EXISTS aadhaar_back_url TEXT;

-- Profile Photo Column for Organisations
ALTER TABLE organisations 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Security Reset Column for User Profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS password_reset_pending BOOLEAN DEFAULT FALSE;

-- Refresh Cache (Essential to see changes)
NOTIFY pgrst, 'reload schema';
```

## Features

- **Public Landing Page:** Displays live analytics, top performers, and community heritage.
- **Role-Based Dashboards:** Separate, secure terminals for Master Admins, Organization Leads, and Field Agents.
- **Security Override:** Organizations can force field agents to reset their passwords on next login if a security breach is suspected.
- **Dual-Document Enrollment:** Multi-step registration requiring both Front and Back scans of identification.
- **Restricted Permissions:** Organization leads can edit and save records, but only the Master Admin can verify/accept them.
- **Reporting & Analytics:** Professional CSV exports and real-time distribution charts.

## Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL Database, Auth, Storage)
- **UI Components:** `lucide-react` for icons, `recharts` for demographics.

---

## 🚀 Getting Started: Setting Up Your Supabase Backend

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com/) and create a project.
2. Note your **Project URL** and **Anon Key**.

### Step 2: Set Up the Database Schema
1. Run the `supabase/schema.sql` file in the SQL Editor.
2. **IMPORTANT:** Run the "Critical" SQL provided at the top of this README.

### Step 3: Configure Storage
1. Go to **Storage** in Supabase.
2. Create a new bucket named `member-images`.
3. Set the bucket to **Public**.

---

## 💻 Running the Application Locally

1. **Install dependencies:** `npm install`
2. **Configure Environment:** Update `supabase/client.ts` with your credentials.
3. **Run development server:** `npm run dev`
