import { supabase } from "@/integrations/supabase/client";

export interface AgentMetadata {
  contractContext?: Record<string, unknown>;
  portfolioUpdate?: Record<string, unknown>;
}

export interface AgentResponse {
  text: string;
  metadata?: AgentMetadata;
  error?: boolean;
}

type HistoryMessage = { role: "user" | "assistant"; content: string };

/**
 * Streams a message to the agent-chat edge function.
 * Calls onDelta for each token, onMetadata for tool results, onDone when finished.
 */
export async function streamAgentMessage({
  content,
  history,
  onDelta,
  onMetadata,
  onDone,
  onError,
}: {
  content: string;
  history: HistoryMessage[];
  onDelta: (text: string) => void;
  onMetadata?: (meta: AgentMetadata) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  if (!content?.trim()) {
    onError("I didn't catch that. Could you try again?");
    return;
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        message: content.trim(),
        history: history.slice(-20),
      }),
    });

    // Handle non-streaming JSON error responses
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      if (data.error) {
        onError(data.text || "Something went wrong.");
      } else {
        onDelta(data.text);
        if (data.contractContext || data.portfolioUpdate) {
          onMetadata?.({ contractContext: data.contractContext, portfolioUpdate: data.portfolioUpdate });
        }
        onDone();
      }
      return;
    }

    if (!resp.ok || !resp.body) {
      onError("Failed to reach the agent. Please try again.");
      return;
    }

    // Parse SSE stream
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);

          // Check for metadata event (tool results)
          if (parsed.metadata) {
            onMetadata?.(parsed.metadata);
            continue;
          }

          const token = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (token) onDelta(token);
        } catch {
          // Partial JSON, put it back
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    // Flush remaining
    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.metadata) { onMetadata?.(parsed.metadata); continue; }
          const token = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (token) onDelta(token);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (err) {
    console.error("[Agent] Stream error:", err);
    onError("Network error. Please check your connection and try again.");
  }
}

/**
 * Save a message to the chat_messages table for persistence.
 */
export async function saveChatMessage(
  userId: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>
) {
  const { error } = await supabase.from("chat_messages").insert({
    user_id: userId,
    conversation_id: conversationId,
    role,
    content,
    metadata: metadata || {},
  });
  if (error) console.error("[Agent] Failed to save message:", error);
}

/**
 * Load conversation history from the database.
 */
export async function loadConversation(
  userId: string,
  conversationId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[Agent] Failed to load conversation:", error);
    return [];
  }
  return (data || []) as Array<{ role: "user" | "assistant"; content: string }>;
}
