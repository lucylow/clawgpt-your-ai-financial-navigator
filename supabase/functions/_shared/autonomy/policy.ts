import { evaluateOutboundTransferPolicy } from "../policyEngine.ts";
import type { PlanStep } from "./types.ts";
import { CHAIN_CONFIGS } from "../chainConfig.ts";
import { getPortfolioTotal } from "../demoData.ts";

/** Hard cap (USD notional) above which autonomous execution must not proceed without human approval. */
const AUTONOMY_MAX_TRANSFER_USD = 1000;

/**
 * Policy gate before each autonomy step. Aligns blueprint rules with policyEngine + gas context.
 */
export async function autonomyPolicyCheck(step: PlanStep): Promise<boolean> {
  if (step.action === "execute_transfer") {
    const amount = Number(step.params.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return false;

    if (amount > AUTONOMY_MAX_TRANSFER_USD) return false;

    const chain = String(step.params.chain ?? "polygon");
    const gasUsd = CHAIN_CONFIGS[chain]?.gasAvgUsd ?? 2;
    const nav = getPortfolioTotal();

    const { decision } = evaluateOutboundTransferPolicy({
      amountUsd: amount,
      portfolioNavUsd: nav,
      gasUsd,
      firstTimeRecipient: Boolean(step.params.first_time_recipient),
    });

    if (decision === "reject") return false;
  }

  return true;
}
