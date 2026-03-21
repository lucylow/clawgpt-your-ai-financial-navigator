/**
 * Agent Autonomy Layer — structured goals, plans, and tool results.
 * Complements AgentContractV1 (turn contract) with multi-step execution state.
 */

export type AgentGoal = {
  id: string;
  userId: string;
  intent: string;
  createdAt: number;
};

export type PlanStepStatus = "pending" | "running" | "completed" | "failed";

export type PlanStep = {
  id: string;
  /** Logical action id (mapped to ClawGPT tools in autonomy/registry.ts). */
  action: string;
  params: Record<string, unknown>;
  status: PlanStepStatus;
  result?: unknown;
  error?: string;
};

export type AgentPlan = {
  goalId: string;
  steps: PlanStep[];
  currentStepIndex: number;
  status: "active" | "completed" | "failed";
};

export type AutonomyToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};
