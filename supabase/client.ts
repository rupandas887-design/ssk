import { createClient } from "@supabase/supabase-js";

// Read from Vite environment variables with fallback to project defaults
const envUrl = typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL;
const envAnonKey = typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const directSupabaseUrl = (envUrl && envUrl.trim() !== "") 
  ? envUrl.trim() 
  : "https://baetdjjzfqupdzsoecph.supabase.co";

export const supabaseAnonKey = (envAnonKey && envAnonKey.trim() !== "") 
  ? envAnonKey.trim() 
  : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZXRkamp6ZnF1cGR6c29lY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzEwMTYsImV4cCI6MjA4MjA0NzAxNn0.MYrwQ7E4HVq7TwXpxum9ZukIz4ZAwyunlhpkwkpZ-bo";

// Detect if we are in an AI Studio iframe preview environment that requires a local proxy.
// In regular production deployments (Vercel, custom domain, etc.), always connect directly to Supabase.
const isBrowser = typeof window !== "undefined";
const isAIStudioPreview = isBrowser && (
  window.location.hostname.includes("run.app") || 
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
);

// In AI Studio preview container, we use same-origin proxy to satisfy sandbox CSP.
// In Vercel / production, we use direct Supabase URL.
export const supabaseUrl = (isBrowser && isAIStudioPreview)
  ? `${window.location.origin}/supabase-proxy`
  : directSupabaseUrl;

export const getSupabaseUrl = (): string => supabaseUrl;

// Resilient fetch: automatically attempts direct connection if proxy returns 404/failure (as on Vercel),
// and logs descriptive errors to console for troubleshooting.
const resilientFetch: typeof fetch = async (input, init) => {
  try {
    const res = await fetch(input, init);
    // If the proxy route is missing (e.g. static host like Vercel where vite dev proxy doesn't run)
    if (!res.ok && res.status === 404) {
      const inputUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input instanceof Request ? input.url : "";
      if (inputUrl.includes("/supabase-proxy")) {
        const fallbackUrl = inputUrl.replace("/supabase-proxy", directSupabaseUrl);
        return await fetch(fallbackUrl, init);
      }
    }
    return res;
  } catch (err) {
    const inputUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input instanceof Request ? input.url : "";
    if (inputUrl.includes("/supabase-proxy")) {
      const fallbackUrl = inputUrl.replace("/supabase-proxy", directSupabaseUrl);
      return await fetch(fallbackUrl, init);
    } else if (inputUrl.startsWith(directSupabaseUrl) && isBrowser && isAIStudioPreview) {
      const proxyUrl = inputUrl.replace(directSupabaseUrl, `${window.location.origin}/supabase-proxy`);
      return await fetch(proxyUrl, init);
    }
    console.error("Supabase Network Fetch Error:", err, "URL:", inputUrl);
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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

// Helper for standalone client instantiation (e.g. secondary signup without overwriting current session)
export const createIsolatedClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: resilientFetch
    }
  });
};
