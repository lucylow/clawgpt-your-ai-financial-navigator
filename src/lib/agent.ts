import {
  isSupabaseConfigured,
  supabaseEdgeFunctionHeaders,
  supabaseEdgeFunctionUrl,
  supabaseEnvKey,
} from "@/lib/supabaseEnv";
import {
  formatAgentErrorMessage,
  parseAgentBackendError,
} from "@/contracts/agentBackendError";
import { loadConversation, saveChatMessage as persistChatMessage } from "@/services/chatMessages.service";
import type { AgentSafetyEnvelope } from "@/lib/agentSafety";

function newCorrelationId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Versioned server-emitted events (SSE metadata); aligns with supabase/functions/_shared/events.ts */
export type AgentBackendEventV1 = {
  v: 1;
  id: string;
  type: string;
  correlationId: string;
  ts: string;
  severity: "info" | "warning" | "error";
  payload: Record<string, unknown>;
};

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
  /** Trace id from edge function (header or body). */
  correlationId?: string;
  /** Structured lifecycle events for cockpit / ticker integration. */
  events?: AgentBackendEventV1[];
  /** Deterministic turn contract from edge pipeline (intent, entities, gating). */
  agentContract?: Record<string, unknown>;
  /** Edge tool execution phase (preview vs blocked) — mirrors supabase `_shared/types` TransactionLifecycleStateV1. */
  transactionLifecycle?: Record<string, unknown>;
}

function mergeCorrelationFromHeaders(
  meta: AgentMetadata | undefined,
  headerId: string | null,
): AgentMetadata | undefined {
  if (!meta && !headerId) return undefined;
  const h = headerId?.trim();
  if (!h) return meta;
  if (!meta) return { correlationId: h };
  return { ...meta, correlationId: meta.correlationId ?? h };
}

export interface AgentResponse {
  text: string;
  metadata?: AgentMetadata;
  error?: boolean;
}

type HistoryMessage = { role: "user" | "assistant"; content: string };

/** Mirrors supabase `sessionMemory` — no secrets. */
export type AgentSessionMemoryV1 = {
  v: 1;
  activeChainKey?: string;
  activeWalletLabel?: string;
  automationPaused?: boolean;
  dailyLimitUsd?: number;
  demoMode?: boolean;
  /** User-owned cap echoed to edge policy prompts (no secrets). */
  maxSingleTxUsd?: number;
  /** Chains the user allows for this session (subset). */
  approvedChainKeys?: string[];
};

/**
 * Streams a message to the agent-chat edge function.
 * Calls onDelta for each token, onMetadata for tool results, onDone when finished.
 */
export async function streamAgentMessage({
  content,
  history,
  sessionMemory,
  idempotencyKey,
  correlationId: clientCorrelationId,
  onDelta,
  onMetadata,
  onDone,
  onError,
}: {
  content: string;
  history: HistoryMessage[];
  /** Optional cockpit context for deterministic intent / policy (edge validates shape). */
  sessionMemory?: AgentSessionMemoryV1;
  /** Client idempotency hint for duplicate POST protection (echoed by edge). */
  idempotencyKey?: string;
  /** Optional client trace id (min 8 chars per edge schema). */
  correlationId?: string;
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

  const anonKey = supabaseEnvKey ?? "";
  const url = supabaseEdgeFunctionUrl("agent-chat");
  if (!url) {
    onError("Chat is not configured (missing Supabase URL).");
    return;
  }

  const traceId =
    clientCorrelationId && clientCorrelationId.length >= 8 ? clientCorrelationId : newCorrelationId();

  try {
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...supabaseEdgeFunctionHeaders(anonKey),
      "X-Correlation-Id": traceId,
    };
    if (idempotencyKey) requestHeaders["X-Idempotency-Key"] = idempotencyKey;

    const resp = await fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        message: content.trim(),
        history: history.slice(-20),
        correlationId: traceId,
        ...(sessionMemory ? { sessionMemory } : {}),
        ...(idempotencyKey ? { idempotencyKey } : {}),
      }),
    });

    // Handle non-streaming JSON responses (success or structured errors)
    const contentType = (resp.headers.get("content-type") || "").toLowerCase();
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
      const headerCorr = resp.headers.get("x-correlation-id")?.trim();
      if (
        data.contractContext ||
        data.portfolioPreview ||
        data.portfolioUpdate ||
        data.safety ||
        data.correlationId ||
        data.events ||
        data.agentContract ||
        data.transactionLifecycle ||
        headerCorr
      ) {
        const base: AgentMetadata = {
          contractContext: data.contractContext as Record<string, unknown> | undefined,
          portfolioPreview: data.portfolioPreview as Record<string, unknown> | undefined,
          portfolioUpdate: data.portfolioUpdate as Record<string, unknown> | undefined,
          applyPortfolioUpdate: data.applyPortfolioUpdate === true,
          safety: data.safety as AgentSafetyEnvelope | undefined,
          correlationId:
            (typeof data.correlationId === "string" ? data.correlationId : undefined) ?? headerCorr ?? traceId,
          events: Array.isArray(data.events) ? (data.events as AgentBackendEventV1[]) : undefined,
          agentContract: data.agentContract && typeof data.agentContract === "object"
            ? (data.agentContract as Record<string, unknown>)
            : undefined,
          transactionLifecycle:
            data.transactionLifecycle && typeof data.transactionLifecycle === "object"
              ? (data.transactionLifecycle as Record<string, unknown>)
              : undefined,
        };
        onMetadata?.(base);
      }
      onDone();
      return;
    }

    if (!resp.ok || !resp.body) {
      let extra = "";
      try {
        const t = await resp.text();
        if (t) {
          try {
            const j = JSON.parse(t) as Record<string, unknown>;
            extra =
              (typeof j.text === "string" && j.text) ||
              (typeof j.message === "string" && j.message) ||
              (typeof j.error === "string" && j.error) ||
              "";
          } catch {
            extra = t.length > 280 ? `${t.slice(0, 280)}…` : t;
          }
        }
      } catch {
        /* use status-only message */
      }
      const statusMsg = !resp.ok ? `Agent returned ${resp.status}.` : "Empty response from agent.";
      onError(extra || `${statusMsg} Please try again.`);
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
              const headerCorr = resp.headers.get("x-correlation-id")?.trim();
              onMetadata?.(
                mergeCorrelationFromHeaders(parsed.metadata as AgentMetadata, headerCorr),
              );
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
            if (parsed.metadata) {
              const headerCorr2 = resp.headers.get("x-correlation-id")?.trim();
              onMetadata?.(
                mergeCorrelationFromHeaders(parsed.metadata as AgentMetadata, headerCorr2),
              );
              continue;
            }
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
