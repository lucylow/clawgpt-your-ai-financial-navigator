import { z } from "zod";

/**
 * Mirrors `supabase/functions/_shared/types.ts` ErrorCategory + BackendErrorBody.
 * Used to parse JSON error bodies from `agent-chat` without treating them as opaque strings.
 */
export const agentErrorCategorySchema = z.enum([
  "VALIDATION_ERROR",
  "AUTH_ERROR",
  "INSUFFICIENT_FUNDS",
  "UNSUPPORTED_CHAIN",
  "UNSUPPORTED_ASSET",
  "ADDRESS_INVALID",
  "RISK_REJECTED",
  "CONFIRMATION_REQUIRED",
  "TX_SUBMISSION_FAILED",
  "RPC_UNAVAILABLE",
  "TIMEOUT",
  "RATE_LIMIT",
  "PAYMENT_REQUIRED",
  "INTERNAL_ERROR",
]);

export const agentBackendErrorSchema = z.object({
  error: z.literal(true),
  code: z.string().min(1),
  message: z.string().min(1),
  category: agentErrorCategorySchema,
  recoverable: z.boolean(),
  correlationId: z.string().min(1),
  debug: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type AgentBackendError = z.infer<typeof agentBackendErrorSchema>;

export function parseAgentBackendError(data: unknown): AgentBackendError | null {
  const r = agentBackendErrorSchema.safeParse(data);
  return r.success ? r.data : null;
}

/**
 * User-facing line; avoids leaking `debug` in production.
 */
export function formatAgentErrorMessage(err: AgentBackendError): string {
  return err.message.trim();
}

/**
 * Safe diagnostic for logs / observability (no secrets).
 */
export function agentErrorToObservabilityContext(err: AgentBackendError): Record<string, unknown> {
  return {
    code: err.code,
    category: err.category,
    recoverable: err.recoverable,
    correlationId: err.correlationId,
  };
}
