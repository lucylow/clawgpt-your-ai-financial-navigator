import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type ChatInsert = Database["public"]["Tables"]["chat_messages"]["Insert"];

export async function saveChatMessage(
  userId: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>,
): Promise<{ error: Error | null }> {
  const row: ChatInsert = {
    user_id: userId,
    conversation_id: conversationId,
    role,
    content,
    metadata: (metadata ?? {}) as Json,
  };
  const { error } = await supabase.from("chat_messages").insert([row]);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function loadConversation(
  userId: string,
  conversationId: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[chatMessages.service] loadConversation:", error);
    return [];
  }
  return (data ?? []) as Array<{ role: "user" | "assistant"; content: string }>;
}
