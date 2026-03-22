/**
 * Versioned agent turn contract — shared by pipeline, HTTP responses, and tests.
 * Keeps planning, policy hints, and UI state machine aligned.
 */

import type {
  AgentDecisionEntryV1,
  AgentLoopPhase,
  AutonomyLevel,
  StructuredPlanV1,
  WorkflowProgressV1,
} from "./autonomyTypes.ts";

export type AgentLifecycleStatus =
  | "idle"
  | "understanding"
  | "planning"
  | "awaiting_clarification"
  | "awaiting_confirmation"
  | "executing"
  | "succeeded"
  | "failed"
  | "partial";

/**
 * How the backend classifies the user turn for gating and tooling.
 * - needs_clarification: required entities are missing — ask before any execution-class tool.
 * - confirmation_required: action is specified but needs explicit human approval (mgmt, policy gate).
 * - executable: specification is complete for the intent; wallet/UI approval may still apply.
 */
export type RequestKind =
  | "informational"
  | "planning_only"
  | "needs_clarification"
  | "confirmation_required"
  | "executable";

export type IntentCategory = "informational" | "planning" | "execution" | "management" | "meta" | "unknown";

/**
 * Stable intent ids — do not rename lightly (frontend / analytics may key on them).
 */
export type IntentId =
  | "info.portfolio_overview"
  | "info.balances_by_chain"
  | "info.transaction_history"
  | "info.supported_chains"
  | "info.supported_assets"
  | "info.fees_and_gas"
  | "info.risk_explanation"
  | "info.activity_summary"
  | "info.wallet_details"
  | "plan.prepare_transfer"
  | "plan.compare_routes"
  | "plan.draft_transaction"
  | "plan.suggest_next_step"
  | "exec.transfer"
  | "exec.bridge"
  | "exec.swap"
  | "exec.aave_deposit"
  | "exec.aave_withdraw"
  | "mgmt.automation_pause"
  | "mgmt.automation_resume"
  | "mgmt.limits"
  | "mgmt.wallet_create"
  | "meta.clarify"
  | "meta.retry"
  | "meta.status"
  | "meta.cancel"
  | "meta.explain_agent"
  | "meta.workflow_continue"
  | "unknown.general";

/** Client/session hints — no secrets. Scoped per request or durable prefs. */
export type SessionMemoryV1 = {
  v: 1;
  activeChainKey?: string;
  activeWalletLabel?: string;
  automationPaused?: boolean;
  dailyLimitUsd?: number;
  localPortfolio?: boolean;
  /** Client user-policy hint: max outgoing notional (USD) for a single leg. */
  maxSingleTxUsd?: number;
  /** Client user-policy hint: allowed chain ids for this session. */
  approvedChainKeys?: string[];
  /** 1 = suggest-only … 5 = policy-bounded workflow autonomy (see autonomyPolicy). */
  autonomyLevel?: AutonomyLevel;
  /** Resume pointer for multi-step workflows (echoed client → server). */
  workflowProgress?: WorkflowProgressV1;
  /** Client may echo last structured plan for UI; server can rebuild from intent. */
  structuredPlanSnapshot?: StructuredPlanV1;
  userPaused?: boolean;
  /** Rolling summary + navigator prompt layers from client (ClawGPT pipeline). */
  conversationSummary?: string;
  clawNavigatorAugmentation?: string;
};

export type ExtractedEntities = {
  chainKeys: string[];
  assets: Array<"USDt" | "XAUt">;
  amount?: { value: number; raw: string; inferred: boolean };
  toAddress?: { value: string; raw: string };
  recipientLabel?: string;
  previewOnly?: boolean;
  /** Raw snippets for audit (not normalized addresses if ambiguous). */
  rawTextNotes: string[];
};

export type ToolPlanStep = {
  order: number;
  tool: string;
  reason: string;
};

export type AgentContractV1 = {
  v: 1;
  intent: IntentId;
  intentCategory: IntentCategory;
  subIntent?: string;
  /** Model-independent confidence for the intent label (0–1). */
  confidence: number;
  entities: ExtractedEntities;
  assumptions: string[];
  missingFields: string[];
  riskLevel: "low" | "medium" | "high" | "blocked";
  requiresConfirmation: boolean;
  requestKind: RequestKind;
  toolPlan: ToolPlanStep[];
  memoryUpdates: Record<string, unknown>;
  nextUserQuestion?: string;
  userFacingSummary: string;
  internalNotes: string[];
  correlationId: string;
  status: AgentLifecycleStatus;
  /** Policy / mode — deterministic hints for the LLM (not a substitute for tool output). */
  policyHints: string[];
  /** Structured multi-step plan (not free text). */
  structuredPlan?: StructuredPlanV1;
  /** Where we are in the explicit agent loop. */
  loopPhase: AgentLoopPhase;
  /** Effective autonomy for this turn (session default or 3). */
  autonomyLevel: AutonomyLevel;
  /** Explainable decisions for observability. */
  decisionLog: AgentDecisionEntryV1[];
};
