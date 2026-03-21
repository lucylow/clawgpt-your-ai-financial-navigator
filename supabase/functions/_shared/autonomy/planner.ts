import type { AgentGoal, AgentPlan, PlanStep } from "./types.ts";

const EVM_ADDR = /\b(0x[a-fA-F0-9]{40})\b/;

function extractAmount(text: string): number | undefined {
  const m =
    text.match(/\b(\d+(?:\.\d+)?)\s*(?:usd[tᵗ]?|usdt|dollars?|xau[tᵗ]?|xaut)?\b/i) ||
    text.match(/\b(?:send|transfer)\s+(\d+(?:\.\d+)?)\b/i);
  if (!m) return undefined;
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value;
}

function extractAddress(text: string): string | undefined {
  const evm = text.match(EVM_ADDR);
  return evm ? evm[1] : undefined;
}

function newStepId(order: number): string {
  try {
    return `step_${order}_${crypto.randomUUID().slice(0, 8)}`;
  } catch {
    return `step_${order}_${Date.now()}`;
  }
}

/**
 * Deterministic planner (swap for LLM + JSON schema later). Builds a send/transfer workflow when intent matches.
 */
export function createPlan(goal: AgentGoal): AgentPlan {
  const t = goal.intent.toLowerCase();
  if (!/\b(send|transfer)\b/i.test(t)) {
    throw new Error("Unsupported intent for autonomy planner");
  }

  const amount = extractAmount(goal.intent) ?? 0;
  const to = extractAddress(goal.intent) ?? "";
  const chain = /\barbitrum\b/i.test(goal.intent)
    ? "arbitrum"
    : /\bethereum\b|\beth\b/i.test(goal.intent)
      ? "ethereum"
      : "polygon";
  const asset: "USDt" | "XAUt" = /\bxaut\b/i.test(goal.intent) ? "XAUt" : "USDt";

  const steps: PlanStep[] = [
    { id: newStepId(1), action: "get_balance", params: {}, status: "pending" },
    {
      id: newStepId(2),
      action: "prepare_transfer",
      params: { amount, to, chain, asset },
      status: "pending",
    },
    { id: newStepId(3), action: "confirm_transfer", params: {}, status: "pending" },
    {
      id: newStepId(4),
      action: "execute_transfer",
      params: {
        amount,
        chain,
        asset,
        to_address: to,
        first_time_recipient: true,
      },
      status: "pending",
    },
  ];

  return {
    goalId: goal.id,
    steps,
    currentStepIndex: 0,
    status: "active",
  };
}
