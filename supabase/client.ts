import { createClient } from "@supabase/supabase-js";

export const directSupabaseUrl = "https://baetdjjzfqupdzsoecph.supabase.co";
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZXRkamp6ZnF1cGR6c29lY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzEwMTYsImV4cCI6MjA4MjA0NzAxNn0.MYrwQ7E4HVq7TwXpxum9ZukIz4ZAwyunlhpkwkpZ-bo";

// In browser preview environments, route requests through the same-origin proxy
// to avoid iframe CSP / cross-origin fetch restrictions.
const isBrowser = typeof window !== "undefined";
export const supabaseUrl = isBrowser ? `${window.location.origin}/supabase-proxy` : directSupabaseUrl;
export const getSupabaseUrl = (): string => supabaseUrl;

// Fallback-resilient fetch implementation for Supabase client
const resilientFetch: typeof fetch = async (input, init) => {
  try {
    const res = await fetch(input, init);
    return res;
  } catch (err) {
    // If the proxy fetch failed and input is a URL string starting with the proxy, try direct
    const inputUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input instanceof Request ? input.url : "";
    if (inputUrl.includes("/supabase-proxy")) {
      const fallbackUrl = inputUrl.replace("/supabase-proxy", directSupabaseUrl);
      return await fetch(fallbackUrl, init);
    } else if (inputUrl.startsWith(directSupabaseUrl) && isBrowser) {
      const proxyUrl = inputUrl.replace(directSupabaseUrl, `${window.location.origin}/supabase-proxy`);
      return await fetch(proxyUrl, init);
    }
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    lock: async (_name, _acquireTimeout, fn) => {
      return await fn();
    }
  },
  global: {
    fetch: resilientFetch
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
