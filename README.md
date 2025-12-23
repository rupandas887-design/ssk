<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SSK People - Membership Management Platform

This is a full-stack application designed to manage the membership drive for the SSK People community, featuring role-based access for Master Admins, Organisations, and Volunteers. It is powered by React on the frontend and Supabase for the database, authentication, and storage.

## Features

- **Public Landing Page:** Displays live analytics, top performers, and community information.
- **Role-Based Dashboards:** Separate, secure dashboards for Master Admins, Organisation Users, and Volunteers.
- **Membership Enrollment:** Multi-step form for volunteers to register new members with Aadhaar validation and image uploads.
- **User Management:** Admins can create and manage organisations; organisations can register and manage their volunteers.
- **Reporting & Analytics:** View and download membership data with powerful filtering options.

## Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL Database, Auth, Storage)
- **UI Components:** `lucide-react` for icons, `recharts` for charts.

---

## 🚀 Getting Started: Setting Up Your Supabase Backend

Follow these steps to configure your own Supabase backend and run the project locally.

### Step 1: Create a Supabase Project

1.  Go to [supabase.com](https://supabase.com/) and sign in or create an account.
2.  On your dashboard, click **"New project"**.
3.  Choose an organisation, give your project a **Name** (e.g., `ssk-people-app`), and generate a secure **Database Password**. Store this password somewhere safe!
4.  Select a **Region** that is closest to your users.
5.  Click **"Create project"** and wait a few minutes for it to be set up.

### Step 2: Set Up the Database Schema

1.  Once your project is ready, navigate to the **SQL Editor** from the left sidebar (look for the `SQL` icon).
2.  Click **"+ New query"**.
3.  Copy the entire content of the `supabase/schema.sql` file from this project.
4.  Paste the SQL content into the Supabase SQL Editor.
5.  Click the **"RUN"** button. This will create all the necessary tables, relationships, and security policies for the app to function correctly.

### Step 2.5: Create the Master Admin User

The application requires a Master Admin to function. You must create this user manually for security.

1. Open the `supabase/seed.sql` file in this project.
2. Follow the step-by-step instructions in that file to create the user in the Supabase Authentication dashboard and then run the provided SQL command to create their profile.

### Step 3: Configure Environment Variables

1.  In your Supabase project, go to **Project Settings** (the gear icon in the sidebar).
2.  Click on **API** in the settings menu.
3.  You will find your **Project URL** and your **Project API Keys**. You need the `anon` `public` key.
4.  In your local project folder, create a new file named `.env.local`.
5.  Copy the contents of `.env.local.example` and paste them into your new `.env.local` file.
6.  Replace the placeholder values with your actual Supabase URL and Anon Key. It should look like this:

    ```
    VITE_SUPABASE_URL=https://your-project-ref.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-public-key
    ```
    
### Step 4: Disable Email Confirmation (for easier testing)

By default, Supabase requires users to confirm their email. For development, you can disable this.

1. In your Supabase project, go to **Authentication** (the user icon in the sidebar).
2. Click on **Providers** and expand the **Email** provider.
3. Toggle off the **"Confirm email"** option.

---

## 💻 Running the Application Locally

**Prerequisites:** [Node.js](https://nodejs.org/) (v18 or later) installed on your machine.

1.  **Install dependencies:**
    Open your terminal in the project root and run:
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```

3.  Open your browser and navigate to `http://localhost:3000`.

You should now see the application running, connected to your personal Supabase backend!