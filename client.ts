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

// Detect if running in an AI Studio iframe preview container
const isBrowser = typeof window !== "undefined";
const isAIStudioPreview = isBrowser && (
  window.location.hostname.includes("run.app") || 
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
);

// In AI Studio preview container, we route through the same-origin proxy to satisfy sandbox CSP.
// In Vercel / production or direct mobile standalone access, we connect directly.
export const supabaseUrl = (isBrowser && isAIStudioPreview)
  ? `${window.location.origin}/supabase-proxy`
  : directSupabaseUrl;

export const getSupabaseUrl = (): string => supabaseUrl;

// Resilient mobile-safe fetch implementation:
// Safely preserves request bodies and headers so retries on mobile Safari / Chrome never fail
// with "TypeError: Cannot construct a Request with a used body"
const resilientFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" 
    ? input 
    : input instanceof URL 
    ? input.toString() 
    : (input && typeof input === "object" && "url" in input) 
    ? (input as Request).url 
    : "";

  let bodyData = init?.body;
  // If input is a Request with a body and init didn't provide body, clone text safely
  if (!bodyData && input instanceof Request && input.method !== 'GET' && input.method !== 'HEAD') {
    try {
      bodyData = await input.clone().text();
    } catch {
      // ignore
    }
  }

  const retryInit: RequestInit = {
    ...init,
    ...(bodyData ? { body: bodyData } : {})
  };

  try {
    const res = await fetch(input, init);
    // If the proxy returns 404/502/503 (e.g. static hosting like Vercel or dev proxy glitch)
    if (!res.ok && (res.status === 404 || res.status === 502 || res.status === 503) && url.includes("/supabase-proxy")) {
      const fallbackUrl = url.replace("/supabase-proxy", directSupabaseUrl);
      return await fetch(fallbackUrl, retryInit);
    }
    return res;
  } catch (err) {
    if (url.includes("/supabase-proxy")) {
      const fallbackUrl = url.replace("/supabase-proxy", directSupabaseUrl);
      try {
        return await fetch(fallbackUrl, retryInit);
      } catch (fallbackErr) {
        console.error("Supabase fallback fetch failed:", fallbackErr);
        throw fallbackErr;
      }
    }
    console.error("Supabase fetch error:", err, "URL:", url);
    throw err;
  }
};

// Custom safe storage wrapper for mobile browsers (iOS Safari Private Mode / incognito / restricted storage)
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn("Storage setItem warning (safe fallback):", e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn("Storage removeItem warning:", e);
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // detectSessionInUrl MUST be false when HashRouter is used to prevent hash URL corruptions on mobile
    detectSessionInUrl: false,
    storage: safeStorage,
    lock: async (_name, _acquireTimeout, fn) => {
      // Async lock bypass to prevent lock hang on mobile backgrounding/tab switching
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
      detectSessionInUrl: false,
      storage: safeStorage
    },
    global: {
      fetch: resilientFetch
    }
  });
};
