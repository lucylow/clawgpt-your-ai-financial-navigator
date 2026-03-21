/** Central Supabase env reads — avoids importing `createClient` from `agent.ts` and keeps checks in sync. */
export const supabaseEnvUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
export const supabaseEnvKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseEnvUrl && supabaseEnvKey);
