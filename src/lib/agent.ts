import { isSupabaseConfigured, supabaseEnvKey, supabaseEnvUrl } from "@/lib/supabaseEnv";
import { loadConversation, saveChatMessage as persistChatMessage } from "@/services/chatMessages.service";
import type { AgentSafetyEnvelope } from "@/lib/agentSafety";

export interface AgentMetadata {
  contractContext?: Record<string, unknown>;
  /** Only applied on the client when `applyPortfolioUpdate` is true (e.g. post-confirmation reconcile). */
  portfolioUpdate?: Record<string, unknown>;
  /** Tool output for display — never mutates portfolio state by itself. */
  portfolioPreview?: Record<string, unknown>;
  /** When true, `portfolioUpdate` may be merged into the client store (reconcile phase). */
  applyPortfolioUpdate?: boolean;
  /** Approval gates, previews, validation, policy, and simulation — server + client defense in depth. */
  safety?: AgentSafetyEnvelope;
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

  if (!isSupabaseConfigured) {
    onError("Chat is not configured (missing Supabase URL or key).");
    return;
  }

  const baseUrl = supabaseEnvUrl ?? "";
  const anonKey = supabaseEnvKey ?? "";
  const url = `${baseUrl.replace(/\/$/, "")}/functions/v1/agent-chat`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        message: content.trim(),
        history: history.slice(-20),
      }),
    });

    // Handle non-streaming JSON responses (success or structured errors)
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      let data: Record<string, unknown>;
      try {
        data = await resp.json();
      } catch {
        onError("Invalid response from the agent. Please try again.");
        return;
      }
      const failed = !resp.ok || data.error === true;
      if (failed) {
        const msg =
          (typeof data.text === "string" && data.text) ||
          (typeof data.message === "string" && data.message) ||
          `Request failed (${resp.status}).`;
        onError(msg);
        return;
      }
      const reply = typeof data.text === "string" ? data.text : "";
      if (reply) onDelta(reply);
      if (data.contractContext || data.portfolioPreview || data.portfolioUpdate || data.safety) {
        onMetadata?.({
          contractContext: data.contractContext as Record<string, unknown> | undefined,
          portfolioPreview: data.portfolioPreview as Record<string, unknown> | undefined,
          portfolioUpdate: data.portfolioUpdate as Record<string, unknown> | undefined,
          applyPortfolioUpdate: data.applyPortfolioUpdate === true,
          safety: data.safety as AgentSafetyEnvelope | undefined,
        });
      }
      onDone();
      return;
    }

    if (!resp.ok || !resp.body) {
      const statusMsg = !resp.ok ? `Agent returned ${resp.status}.` : "Empty response from agent.";
      onError(`${statusMsg} Please try again.`);
      return;
    }

    // Parse SSE stream
    const reader = resp.body.getReader();
    try {
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
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* lock may already be released */
      }
    }
  } catch (err) {
    console.error("[Agent] Stream error:", err);
    onError("Network error. Please check your connection and try again.");
  }
}

/** Persist chat row — errors are logged; callers may ignore for UX continuity. */
export async function saveChatMessage(
  userId: string,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>,
) {
  const { error } = await persistChatMessage(userId, conversationId, role, content, metadata);
  if (error) console.error("[Agent] Failed to save message:", error);
}

export { loadConversation };
