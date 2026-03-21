import type { AgentPlan } from "./types.ts";

const plans = new Map<string, AgentPlan>();

export function savePlan(plan: AgentPlan): void {
  plans.set(plan.goalId, plan);
}

export function getPlan(goalId: string): AgentPlan | undefined {
  return plans.get(goalId);
}

/** Test helper — clears in-memory plans. */
export function clearPlansForTests(): void {
  plans.clear();
}
