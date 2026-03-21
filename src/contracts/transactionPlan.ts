/**
 * Structured transaction planning — aligns UI, agent reasoning, and wallet execution.
 * WDK write flows require explicit user approval; plans carry lifecycle state separate from chat text.
 *
 * See docs/WDK.md (preview → approval → submit).
 */

export type TransactionPlanKind = "tether_transfer" | "bridge" | "swap" | "other";

/**
 * Lifecycle for execution-class actions. Backend must not broadcast on `draft` / `preview` / `awaiting_approval`.
 */
export type TransactionApprovalState =
  | "draft"
  | "preview"
  | "awaiting_approval"
  | "approved"
  | "submitted"
  | "confirmed"
  | "failed"
  | "rejected"
  | "canceled"
  | "expired";

export interface TransactionPlanV1 {
  id: string;
  kind: TransactionPlanKind;
  approval: TransactionApprovalState;
  createdAtMs: number;
  /** Optional validity window to avoid replaying stale approvals. */
  expiresAtMs?: number;
  chain: string;
  asset: string;
  amount: string;
  recipient?: string;
  estimatedFeeUsd?: number;
  riskNotes?: string[];
  /** Invariant: true for any on-chain write in production. */
  requiresHumanApproval: boolean;
  /** Correlates agent-chat / client logs — not a blockchain tx id. */
  correlationId?: string;
}
