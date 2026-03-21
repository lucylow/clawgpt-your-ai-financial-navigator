/** Central Supabase env reads — avoids importing `createClient` from `agent.ts` and keeps checks in sync. */
export const supabaseEnvUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
export const supabaseEnvKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseEnvUrl && supabaseEnvKey);

/** Headers Supabase Edge Functions expect (aligned with @supabase/supabase-js `functions.invoke`). */
export function supabaseEdgeFunctionHeaders(anonKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  };
}

export function supabaseEdgeFunctionUrl(functionName: string): string | null {
  const base = supabaseEnvUrl?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/functions/v1/${functionName}`;
}
