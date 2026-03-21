import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseEnvKey, supabaseEnvUrl } from "@/lib/supabaseEnv";
import type { Database } from "./types";

export { isSupabaseConfigured };

// createClient throws synchronously if URL or key are missing/empty — that yields a blank page
// when Lovable/CI env vars are not synced yet. Use placeholders so the shell can render; configure
// VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY in Lovable project settings for real auth.
const SUPABASE_URL = supabaseEnvUrl || "https://placeholder.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  supabaseEnvKey ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder-key";

if (!isSupabaseConfigured) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL and/or VITE_SUPABASE_PUBLISHABLE_KEY missing — using placeholders. Add them in Lovable → Project → Environment (or .env) so auth and data work.",
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    // Avoid noisy refresh / storage sync against placeholder credentials in preview.
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
  },
});