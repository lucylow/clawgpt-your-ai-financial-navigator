import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

// createClient throws synchronously if URL or key are missing/empty — that yields a blank page
// when Lovable/CI env vars are not synced yet. Use placeholders so the shell can render; configure
// VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY in Lovable project settings for real auth.
const SUPABASE_URL = rawUrl || "https://placeholder.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  rawKey ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder-key";

if (!rawUrl || !rawKey) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL and/or VITE_SUPABASE_PUBLISHABLE_KEY missing — using placeholders. Add them in Lovable → Project → Environment (or .env) so auth and data work.",
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});