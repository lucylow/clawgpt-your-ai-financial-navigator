/**
 * Policy-constrained autonomy — shared types for plans, loop phases, and observability.
 * Plans are structured JSON, not free text; the LLM still narrates using this contract.
 *
 * `sourceIntent` values align with `IntentId` in agentContract.ts (kept as string to avoid import cycles).
 */

/** Progressive autonomy (1 = tightest). */
export type AutonomyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Explicit agent loop: perceive → plan → execute → observe → adapt → complete.
 * Mirrors the architecture doc; surfaced in turn contract for explainability.
 */
export type AgentLoopPhase =
  | "perceive"
  | "plan"
  | "execute"
  | "observe"
  | "adapt"
  | "complete";

export type PlanStepStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

export type ToolAutonomyTier = "read" | "assessment" | "preview_write" | "write";

/** Single step in a structured workflow — never rely on prose alone. */
export type StructuredPlanStepV1 = {
  id: string;
  order: number;
  /** Tool name aligned with toolDefinitions / toolExecutor. */
  tool: string;
  /** Why this step exists (one line, for UI / audit). */
  objective: string;
  /** Step ids that must succeed first (empty = none). */
  dependsOn: string[];
  /** Named slots still empty for this step (e.g. amount, destination). */
  requiredData: string[];
  status: PlanStepStatus;
  /** Bounded retries / alternates — not open-ended prose. */
  fallbacks: Array<{ kind: "retry" | "alternate_tool" | "ask_user"; detail: string }>;
  tier: ToolAutonomyTier;
};

export type StructuredPlanV1 = {
  v: 1;
  id: string;
  goal: string;
  sourceIntent: string;
  steps: StructuredPlanStepV1[];
  /** ISO timestamp when generated. */
  createdAt: string;
};

/** Resume pointer — survives across chat turns when client echoes sessionMemory. */
export type WorkflowProgressV1 = {
  v: 1;
  planId: string;
  sourceIntent: string;
  goal: string;
  completedStepIds: string[];
  /** Index into structuredPlan.steps for the next actionable step. */
  nextStepIndex: number;
  updatedAt: string;
};

/** Explainable decision for observability / cockpit. */
export type AgentDecisionEntryV1 = {
  id: string;
  ts: string;
  kind: "policy" | "routing" | "retry" | "user_gate";
  summary: string;
  autonomyLevel: AutonomyLevel;
};
