# Production Deployment Checklist (Vercel & Supabase)

Use this checklist before and after every production release to ensure database connectivity, authentication, and security policies are active.

---

### Phase 1: Supabase Configuration
- [ ] **SQL Migrations Applied**:
  - Run `001_initial_schema.sql` in Supabase SQL Editor.
  - Run `002_rls_policies.sql` in Supabase SQL Editor.
  - Run `003_indexes.sql` in Supabase SQL Editor.
  - Run `004_seed_data.sql` in Supabase SQL Editor.
- [ ] **Storage Bucket Created**:
  - Ensure the `member-images` bucket exists under **Storage** → **Buckets**.
  - Verify **Public bucket** is enabled.
- [ ] **URL Configuration**:
  - In **Authentication** → **URL Configuration**, set **Site URL** to your Vercel production URL (e.g. `https://your-domain.vercel.app`).
  - Add `https://your-domain.vercel.app/**` to **Redirect URLs**.
- [ ] **Email Auth Provider**:
  - Ensure Email provider is enabled under **Authentication** → **Providers**.
  - Disable "Confirm email" if immediate self-login for volunteers without email confirmation is required.

---

### Phase 2: Vercel Hosting Environment Variables
- [ ] Go to **Project Settings** → **Environment Variables** in Vercel.
- [ ] Add `VITE_SUPABASE_URL`:
  ```text
  https://baetdjjzfqupdzsoecph.supabase.co
  ```
- [ ] Add `VITE_SUPABASE_ANON_KEY`:
  ```text
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZXRkamp6ZnF1cGR6c29lY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzEwMTYsImV4cCI6MjA4MjA0NzAxNn0.MYrwQ7E4HVq7TwXpxum9ZukIz4ZAwyunlhpkwkpZ-bo
  ```
- [ ] Ensure both **Production** and **Preview** checkboxes are checked for both variables.

---

### Phase 3: Build & Verification
- [ ] Trigger a fresh production deployment in Vercel (**Redeploy without cache**).
- [ ] Open the deployed URL in an incognito window.
- [ ] Verify the **Landing Page**:
  - Live analytics numbers display counts (e.g. Total Verified Members, Gender Chart, Occupation Breakdown).
  - Active Field Volunteers marquee rotates volunteer names.
- [ ] Open the Diagnostic Page:
  - Visit `/#/diagnostics` (or click Database Diagnostic) to verify green checkmarks on all database tables and queries.
- [ ] Test Login:
  - Login as Master Admin (`masteradmin@ssk.com`).
  - Confirm redirect to Admin Dashboard with live stats and organization cards.
  - Log out and test Volunteer login.
- [ ] Inspect Browser DevTools:
  - Open **Console** and ensure there are no 404 errors for `/supabase-proxy` or unhandled promise rejections.
