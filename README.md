
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SSK People - Membership Management Platform

This is a full-stack application designed to manage the membership drive for the SSK People community, featuring role-based access for Master Admins, Organizations, and Field Agents. It is powered by React on the frontend and Supabase for the database, authentication, and storage.

## 🚨 Critical: Database Schema Update (Fix for Missing Columns)

If you are seeing errors like `Could not find the 'aadhaar_back_url' column`, you must update your Supabase table. 

1. Go to your **Supabase Dashboard** -> **SQL Editor**.
2. Click **"+ New query"**.
3. Paste and run the following SQL command:

```sql
-- Add the mandatory identity document columns
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS aadhaar_front_url TEXT,
ADD COLUMN IF NOT EXISTS aadhaar_back_url TEXT;

-- Refresh the PostgREST cache (Supabase API)
NOTIFY pgrst, 'reload schema';
```

## Features

- **Public Landing Page:** Displays live analytics, top performers, and community heritage.
- **Role-Based Dashboards:** Separate, secure terminals for Master Admins, Organization Leads, and Field Agents.
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
2. **IMPORTANT:** Run the "Database Schema Update" SQL provided at the top of this README to ensure the latest multi-image columns exist.

### Step 3: Configure Storage
1. Go to **Storage** in Supabase.
2. Create a new bucket named `member-images`.
3. Set the bucket to **Public**.

---

## 💻 Running the Application Locally

1. **Install dependencies:** `npm install`
2. **Configure Environment:** Update `supabase/client.ts` with your credentials.
3. **Run development server:** `npm run dev`
