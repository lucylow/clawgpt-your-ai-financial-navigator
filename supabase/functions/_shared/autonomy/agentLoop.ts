import { autonomyPolicyCheck } from "./policy.ts";
import { executeAutonomyTool } from "./registry.ts";
import type { AgentContractV1 } from "../agentContract.ts";
import type { AgentPlan, PlanStep } from "./types.ts";

function shouldRetry(step: PlanStep): boolean {
  return step.action === "get_balance";
}

/**
 * Perceive → plan → act → observe loop over a structured plan (single-threaded; persist via store).
 */
export async function runAgentLoop(plan: AgentPlan, contract?: AgentContractV1): Promise<AgentPlan> {
  const retriesByStepId = new Map<string, number>();

  while (plan.status === "active") {
    const step = plan.steps[plan.currentStepIndex];

    if (!step) {
      plan.status = "completed";
      break;
    }

    try {
      step.status = "running";

      const allowed = await autonomyPolicyCheck(step);
      if (!allowed) {
        step.status = "failed";
        step.error = "Policy violation";
        plan.status = "failed";
        break;
      }

      const result = await executeAutonomyTool(step.action, step.params, contract);

      if (!result.success) {
        throw new Error(result.error ?? "Tool execution failed");
      }

      step.status = "completed";
      step.result = result.data;

      plan.currentStepIndex++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      step.status = "failed";
      step.error = message;

      const prev = retriesByStepId.get(step.id) ?? 0;
      if (shouldRetry(step) && prev < 1) {
        retriesByStepId.set(step.id, prev + 1);
        step.status = "pending";
        step.error = undefined;
        continue;
      }

      plan.status = "failed";
      break;
    }
  }

  return plan;
}
