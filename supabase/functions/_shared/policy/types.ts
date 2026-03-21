/**
 * Programmable finance / policy-as-code contracts (edge + Vitest).
 * Actions map to tool names and synthetic pipeline actions like `outbound_preview`.
 */

export type PolicyPhase = "pre" | "post";

export type PolicyContext = {
  userId: string;
  /** Tool name (e.g. transfer_tokens) or pipeline action (e.g. outbound_preview). */
  action: string;
  params: Record<string, unknown>;
  /** Balances, NAV, gas, session flags — optional per call site. */
  state?: Record<string, unknown>;
};

export type PolicyResult = {
  allowed: boolean;
  reason?: string;
  /** When true, execution should not proceed without explicit user approval (preview may still be shown). */
  requiresApproval?: boolean;
};

export interface Policy {
  id: string;
  name: string;
  /** Pre-tool (default) or post-result validation. */
  phase?: PolicyPhase;
  evaluate(ctx: PolicyContext): PolicyResult;
}
