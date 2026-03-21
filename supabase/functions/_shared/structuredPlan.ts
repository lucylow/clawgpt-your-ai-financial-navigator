import type { AgentContractV1, ExtractedEntities, ToolPlanStep } from "./agentContract.ts";
import type {
  AgentDecisionEntryV1,
  AgentLoopPhase,
  AutonomyLevel,
  StructuredPlanStepV1,
  StructuredPlanV1,
} from "./autonomyTypes.ts";
import { tierForTool } from "./autonomyPolicy.ts";

function newPlanId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function newDecisionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function requiredDataForStep(tool: string, entities: ExtractedEntities, missing: string[]): string[] {
  const tier = tierForTool(tool);
  if (tier !== "preview_write" && tier !== "assessment") return [];
  const need: string[] = [];
  if (missing.includes("amount")) need.push("amount");
  if (missing.includes("destination")) need.push("destination");
  if (missing.includes("chain")) need.push("chain");
  if (missing.includes("asset")) need.push("asset");
  if (missing.includes("route") || missing.includes("from_and_to_chain")) need.push("route");
  return [...new Set(need)];
}

function fallbacksFor(tool: string): StructuredPlanStepV1["fallbacks"] {
  const t = tool.toLowerCase();
  if (t === "transfer_tokens" || t === "bridge_tokens" || t === "swap_tokens") {
    return [
      { kind: "retry", detail: "Retry with smaller notional if policy blocked" },
      { kind: "ask_user", detail: "Confirm recipient and chain if ambiguous" },
    ];
  }
  if (t === "risk_check") {
    return [{ kind: "alternate_tool", detail: "Use get_portfolio to re-check balances before sizing" }];
  }
  return [{ kind: "ask_user", detail: "Pause and clarify missing fields" }];
}

function stepStatus(
  i: number,
  missing: string[],
  stepRequired: string[],
): StructuredPlanStepV1["status"] {
  if (stepRequired.some((r) => missing.includes(r))) return "pending";
  if (i === 0) return "in_progress";
  return "pending";
}

/**
 * Builds a structured, non–free-text plan from the deterministic tool plan + entities.
 */
export function buildStructuredPlan(contract: AgentContractV1): StructuredPlanV1 {
  const steps: StructuredPlanStepV1[] = [];
  const toolSteps = contract.toolPlan;
  const missing = contract.missingFields;

  for (let i = 0; i < toolSteps.length; i++) {
    const tp: ToolPlanStep = toolSteps[i];
    const prev = toolSteps[i - 1];
    const dependsOn = prev ? [`step_${prev.order}`] : [];
    const req = requiredDataForStep(tp.tool, contract.entities, missing);
    const st = stepStatus(i, missing, req);
    steps.push({
      id: `step_${tp.order}`,
      order: tp.order,
      tool: tp.tool,
      objective: tp.reason,
      dependsOn,
      requiredData: req,
      status: st,
      fallbacks: fallbacksFor(tp.tool),
      tier: tierForTool(tp.tool),
    });
  }

  return {
    v: 1,
    id: newPlanId(),
    goal: contract.userFacingSummary.slice(0, 280),
    sourceIntent: contract.intent,
    steps,
    createdAt: new Date().toISOString(),
  };
}

export function deriveLoopPhase(contract: AgentContractV1): AgentLoopPhase {
  const { status, requestKind } = contract;
  if (status === "awaiting_clarification" || requestKind === "needs_clarification") return "perceive";
  if (status === "planning" || requestKind === "planning_only") return "plan";
  if (status === "awaiting_confirmation" || status === "executing") return "execute";
  if (status === "succeeded" || status === "failed" || status === "partial") return "complete";
  if (requestKind === "informational") return "observe";
  return "adapt";
}

export function buildDecisionLog(args: {
  contract: AgentContractV1;
  autonomyLevel: AutonomyLevel;
  loopPhase: AgentLoopPhase;
}): AgentDecisionEntryV1[] {
  const { contract, autonomyLevel, loopPhase } = args;
  const ts = new Date().toISOString();
  const entries: AgentDecisionEntryV1[] = [
    {
      id: newDecisionId(),
      ts,
      kind: "policy",
      summary: `Loop phase ${loopPhase}; requestKind=${contract.requestKind}; risk=${contract.riskLevel}`,
      autonomyLevel,
    },
  ];
  if (contract.entities.chainKeys.length) {
    entries.push({
      id: newDecisionId(),
      ts,
      kind: "routing",
      summary: `Chains considered: ${contract.entities.chainKeys.join(", ")}`,
      autonomyLevel,
    });
  }
  if (contract.requiresConfirmation) {
    entries.push({
      id: newDecisionId(),
      ts,
      kind: "user_gate",
      summary: "Sensitive path — explicit confirmation required before any write-class preview is acted on",
      autonomyLevel,
    });
  }
  return entries;
}

/**
 * Initial workflow progress for client echo-back; advances on explicit "continue" turns.
 */
export function initialWorkflowProgress(plan: StructuredPlanV1): import("./autonomyTypes.ts").WorkflowProgressV1 {
  return {
    v: 1,
    planId: plan.id,
    sourceIntent: plan.sourceIntent,
    goal: plan.goal,
    completedStepIds: [],
    nextStepIndex: 0,
    updatedAt: plan.createdAt,
  };
}
