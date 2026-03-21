import { runAgentLoop } from "./agentLoop.ts";
import { createPlan } from "./planner.ts";
import { savePlan } from "./store.ts";
import type { AgentContractV1 } from "../agentContract.ts";
import type { AgentGoal, AgentPlan } from "./types.ts";

/**
 * Goal → plan → execute — entry point for orchestrators (HTTP, jobs, or tests).
 */
export async function runAutonomyFromGoal(goal: AgentGoal, contract?: AgentContractV1): Promise<AgentPlan> {
  const plan = createPlan(goal);
  savePlan(plan);
  return runAgentLoop(plan, contract);
}
