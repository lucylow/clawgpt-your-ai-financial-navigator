/**
 * Shared contracts for the ClawGPT agent-chat edge function.
 * Keep free of Deno-specific APIs so tests can import from Node.
 */

export type { AgentContractV1, SessionMemoryV1 } from "./agentContract.ts";
export type { AgentGoal, AgentPlan, AutonomyToolResult, PlanStep, PlanStepStatus } from "./autonomy/types.ts";

export type AaveProtocol = { lendingPool: string; dataProvider: string; avgApy: number };
export type UniswapProtocol = { router: string; factory: string };
export type ChainProtocols = {
  aave?: AaveProtocol;
  uniswap?: UniswapProtocol;
};

export type ChainConfig = {
  name: string;
  chainId: number;
  gasAvgUsd: number;
  tokens: Record<string, string>;
  protocols: ChainProtocols;
};

export type SafetyEnvelope = {
  approvalGate: { required: true; reason: string; surface: "transaction_card" | "wallet" };
  actionPreview: {
    title: string;
    steps: string[];
    contracts: Array<{ label: string; address: string }>;
    amounts: Array<{ label: string; value: string }>;
  };
  addressValidation: { valid: boolean; chain: string; normalized?: string; errors: string[] };
  policy: { passed: boolean; violations: string[]; guardrailSummary: string[] };
  transactionSimulation: {
    outcome: "ok" | "would_revert" | "unknown";
    gasEstimateUsd: number;
    summary: string;
    method: "heuristic_model";
  };
};

/**
 * Explicit lifecycle for execution-class tools (audit + UI). Wallet approval/submission happens client-side (WDK).
 * Aligns with: draft → previewed → approved → submitted → confirmed | failed.
 */
export type TransactionLifecycleStateV1 =
  | { v: 1; state: "previewed"; tool: string; action: string; chain?: string }
  | { v: 1; state: "blocked"; tool: string; reason: string; action?: string };

export type ToolExecuteResult = {
  text: string;
  contractContext?: Record<string, unknown>;
  portfolioPreview?: Record<string, unknown>;
  safety?: SafetyEnvelope;
  /** Machine-readable phase — not a substitute for contractContext but stable for logging/events. */
  transactionLifecycle?: TransactionLifecycleStateV1;
  /** Policy engine: explicit approval required before signing (preview may still be shown). */
  policyGate?: { requiresApproval: true; reason?: string };
};

export type ToolCall = {
  id: string;
  function: { name: string; arguments: string | Record<string, unknown> };
};

export type RouteMeta = { label: string; etaHours: string; relayUsd: number; hops: number; notes: string };

/** Versioned realtime-style events for UI sync (SSE metadata + JSON responses). */
export type AgentEventV1 = {
  v: 1;
  id: string;
  type: string;
  correlationId: string;
  ts: string;
  severity: "info" | "warning" | "error";
  payload: Record<string, unknown>;
};

export type ErrorCategory =
  | "VALIDATION_ERROR"
  | "AUTH_ERROR"
  | "INSUFFICIENT_FUNDS"
  | "UNSUPPORTED_CHAIN"
  | "UNSUPPORTED_ASSET"
  | "ADDRESS_INVALID"
  | "RISK_REJECTED"
  | "CONFIRMATION_REQUIRED"
  | "TX_SUBMISSION_FAILED"
  | "RPC_UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "PAYMENT_REQUIRED"
  | "INTERNAL_ERROR";

export type BackendErrorBody = {
  error: true;
  code: string;
  message: string;
  category: ErrorCategory;
  recoverable: boolean;
  correlationId: string;
  debug?: string;
  details?: Record<string, unknown>;
};
