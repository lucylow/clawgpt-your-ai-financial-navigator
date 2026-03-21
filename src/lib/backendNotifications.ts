import { supabase } from "@/integrations/supabase/client";

export async function markNotificationReadInDb(id: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error ? new Error(error.message) : null };
}

export async function markAllNotificationsReadInDb(ids: string[]): Promise<{ error: Error | null }> {
  if (ids.length === 0) return { error: null };
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);
  return { error: error ? new Error(error.message) : null };
}
