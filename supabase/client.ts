import { createClient } from "@supabase/supabase-js";

// Updated with the provided Supabase credentials
const supabaseUrl = "https://baetdjjzfqupdzsoecph.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZXRkamp6ZnF1cGR6c29lY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzEwMTYsImV4cCI6MjA4MjA0NzAxNn0.MYrwQ7E4HVq7TwXpxum9ZukIz4ZAwyunlhpkwkpZ-bo";

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-project-ref")) {
  throw new Error(
    "Supabase URL and Anon Key are not set. Please update them in supabase/client.ts"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);