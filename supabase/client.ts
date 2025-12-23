import { createClient } from "@supabase/supabase-js";

// NOTE: These are public demo credentials for Supabase.
// They are provided so the application can run for demonstration purposes.
// For your own project, please follow the instructions in README.md to create your own Supabase project and use your own credentials.
const supabaseUrl = "https://ivqbfiualsuwmkqsdswo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-project-ref")) {
  throw new Error(
    "Supabase URL and Anon Key are not set. Please update them in supabase/client.ts"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);