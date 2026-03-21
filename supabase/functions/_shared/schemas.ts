import { z } from "npm:zod@3.25.76";

const historyMessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const sessionMemorySchema = z
  .object({
    v: z.literal(1),
    activeChainKey: z.string().min(2).max(32).optional(),
    activeWalletLabel: z.string().max(128).optional(),
    automationPaused: z.boolean().optional(),
    dailyLimitUsd: z.number().positive().optional(),
    demoMode: z.boolean().optional(),
    maxSingleTxUsd: z.number().positive().optional(),
    approvedChainKeys: z.array(z.string().min(2).max(32)).max(16).optional(),
  })
  .strict();

/** Inbound POST /agent-chat body — validated at the HTTP boundary. */
export const agentChatRequestSchema = z.object({
  message: z.string().min(1, "message is required"),
  history: z.array(historyMessageSchema).max(50).optional().default([]),
  /** Client-supplied id for tracing chat → tool → wallet flows */
  correlationId: z.string().min(8).max(128).optional(),
  /** Echo-only idempotency hint for duplicate-submit protection on the client */
  idempotencyKey: z.string().min(8).max(128).optional(),
  /** Optional session hints (no secrets) — feeds deterministic intent / policy layer */
  sessionMemory: sessionMemorySchema.optional(),
});

export type AgentChatRequest = z.infer<typeof agentChatRequestSchema>;
