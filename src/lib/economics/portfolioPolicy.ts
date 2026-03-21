import type { NestedAllocation } from "@/types";
import { DEFAULT_RISK_BUDGET, MIN_NET_EDGE_USD, MIN_REBALANCE_NOTIONAL_USD } from "./constants";
import { estimateBridgeExecutionCostUsd, estimateSwapSlippage } from "./executionCost";
import type { AssetRole, FinancialRecommendation, RiskBudget } from "./types";
import { assetRoleForSymbol } from "./assetRoles";

export function totalPortfolioUsd(allocation: Record<string, number>): number {
  return Object.values(allocation).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
}

export function usdtOnChain(nested: NestedAllocation, chain: string): number {
  const v = nested[chain]?.USDt;
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
}

export function xautOnChain(nested: NestedAllocation, chain: string): number {
  const v = nested[chain]?.XAUt;
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
}

export function requiredUsdTReserveUsd(totalPortfolioUsdValue: number, budget: RiskBudget = DEFAULT_RISK_BUDGET): number {
  const pct = totalPortfolioUsdValue * budget.minUsdTReserveFraction;
  return Math.max(budget.minUsdTReserveUsdFloor, pct);
}

/** Minimum USDt to keep on a chain after a drain (fees + local runway). */
export function minUsdTKeepOnChainUsd(usdtBefore: number): number {
  if (usdtBefore <= 0) return 0;
  return Math.max(50, 0.08 * usdtBefore);
}

/** Global: total USDt should cover a fraction of NAV (liquidity sleeve). */
export function globalUsdTReserveBreached(
  totalUsdTAcrossChains: number,
  totalPortfolioUsdValue: number,
  budget: RiskBudget = DEFAULT_RISK_BUDGET,
): boolean {
  if (totalPortfolioUsdValue <= 0) return true;
  const minTotal = totalPortfolioUsdValue * budget.minUsdTReserveFraction;
  return totalUsdTAcrossChains < Math.max(budget.minUsdTReserveUsdFloor * 0.25, minTotal);
}

export function chainWeight(chainUsd: number, total: number): number {
  if (total <= 0) return 0;
  return chainUsd / total;
}

/** Preview chain weights after a same-NAV bridge (total unchanged). */
export function projectedChainWeightsAfterBridge(
  allocation: Record<string, number>,
  fromChain: string,
  toChain: string,
  amount: number,
): Record<string, number> {
  const total = totalPortfolioUsd(allocation);
  if (total <= 0) return {};
  const next = { ...allocation };
  next[fromChain] = (next[fromChain] ?? 0) - amount;
  next[toChain] = (next[toChain] ?? 0) + amount;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(next)) {
    out[k] = v / total;
  }
  return out;
}

export interface BridgeEvaluationInput {
  allocation: Record<string, number>;
  allocationByAsset: NestedAllocation;
  fromChain: string;
  toChain: string;
  amountUsd: number;
  asset: "USDt" | "XAUt";
  /** Optional: modeled monthly benefit from moving (e.g. lower future tx fees), USD */
  expectedBenefitUsd?: number;
  riskBudget?: RiskBudget;
}

export type BridgeDecision =
  | {
      action: "hold";
      reason: string;
      recommendation?: undefined;
    }
  | {
      action: "proceed";
      recommendation: FinancialRecommendation;
    };

/**
 * Decide whether a cross-chain move is economically rational vs holding.
 * Conservative: prefers hold when edge is unclear or costs dominate.
 */
export function evaluateBridgeMove(input: BridgeEvaluationInput): BridgeDecision {
  const budget = input.riskBudget ?? DEFAULT_RISK_BUDGET;
  const total = totalPortfolioUsd(input.allocation);
  if (total <= 0) {
    return { action: "hold", reason: "Portfolio total is zero or unknown — no safe move." };
  }

  if (input.fromChain === input.toChain) {
    return { action: "hold", reason: "Source and destination are the same — no bridge needed." };
  }

  if (!Number.isFinite(input.amountUsd) || input.amountUsd < MIN_REBALANCE_NOTIONAL_USD) {
    return {
      action: "hold",
      reason: `Amount is below minimum rebalance size ($${MIN_REBALANCE_NOTIONAL_USD}) — avoids fee churn.`,
    };
  }

  const assetRole: AssetRole = assetRoleForSymbol(input.asset);
  if (assetRole === "hedge" && input.asset === "XAUt") {
    const xautAvail = xautOnChain(input.allocationByAsset, input.fromChain);
    if (input.amountUsd > xautAvail) {
      return { action: "hold", reason: "Requested move exceeds available XAUt on source chain." };
    }
  } else {
    const usdtAvail = usdtOnChain(input.allocationByAsset, input.fromChain);
    if (input.amountUsd > usdtAvail) {
      return { action: "hold", reason: "Requested move exceeds available USDt on source chain." };
    }
  }

  if (assetRole === "hedge") {
    const usdtForGas = usdtOnChain(input.allocationByAsset, input.fromChain);
    if (usdtForGas < 50) {
      return {
        action: "hold",
        reason: "Keep at least ~$50 USDt on the source chain for gas and settlement — XAUt is not a cash substitute.",
      };
    }
  } else {
    const usdtBefore = usdtOnChain(input.allocationByAsset, input.fromChain);
    const usdtAfter = usdtBefore - input.amountUsd;
    const minKeep = minUsdTKeepOnChainUsd(usdtBefore);
    if (usdtAfter < minKeep) {
      return {
        action: "hold",
        reason: `Would pull USDt below the local reserve (~$${Math.round(minKeep)}) on ${input.fromChain} after fees — keep liquidity for gas and short-term needs.`,
      };
    }
  }

  const toChainUsd = input.allocation[input.toChain] ?? 0;
  const projectedToWeight = chainWeight(toChainUsd + input.amountUsd, total);
  if (projectedToWeight > budget.maxChainWeight) {
    return {
      action: "hold",
      reason: `Destination would exceed ~${Math.round(budget.maxChainWeight * 100)}% of portfolio — avoid concentrating more on one chain.`,
    };
  }

  const exec = estimateBridgeExecutionCostUsd({
    fromChain: input.fromChain,
    toChain: input.toChain,
    notionalUsd: input.amountUsd,
    asset: input.asset,
  });

  const slip = estimateSwapSlippage({
    fromAsset: input.asset,
    toAsset: input.asset,
    notionalUsd: input.amountUsd,
  });

  const modeledBenefit =
    input.expectedBenefitUsd ??
    (input.asset === "USDt"
      ? Math.min(85, input.amountUsd * 0.004)
      : Math.min(40, input.amountUsd * 0.0015));

  const slippageUsd = (input.amountUsd * slip.basisPoints) / 10_000;
  const netEdge = modeledBenefit - exec.totalUsd - slippageUsd;

  if (netEdge < MIN_NET_EDGE_USD) {
    return {
      action: "hold",
      reason: `Expected net benefit (~$${netEdge.toFixed(
        0,
      )}) after fees and slippage is below the minimum edge ($${MIN_NET_EDGE_USD}) — holding is better.`,
    };
  }

  const liquidityImpact =
    input.asset === "USDt"
      ? `Moves ${input.amountUsd.toFixed(0)} USD of liquidity from ${input.fromChain} to ${input.toChain}; leaves ~$${Math.max(0, usdtAfter).toFixed(0)} USDt on ${input.fromChain}.`
      : `Moves ${input.amountUsd.toFixed(0)} USD notional of XAUt hedge exposure; not a cash substitute for spending.`;

  const principalRisks: string[] = [
    "Bridge smart-contract / relayer risk",
    "Execution delay and partial fills on volatile routes",
    input.asset === "XAUt" ? "Gold token liquidity and spread risk" : "Stablecoin depeg risk (non-zero)",
  ];

  const diversificationDelta =
    chainWeight(fromChainUsd, total) > budget.maxChainWeight * 0.95 ? "improves" : "neutral";

  const recommendation: FinancialRecommendation = {
    expectedBenefitUsd: modeledBenefit,
    principalRisks,
    executionCost: exec,
    liquidityImpact,
    timeHorizon: "weeks",
    confidence: netEdge > MIN_NET_EDGE_USD * 2 ? "medium" : "low",
    diversificationDelta,
    whyNow: "Costs are dominated by a durable benefit (e.g. lower ongoing fee drag on a cheaper chain).",
    whyNotNow:
      netEdge < MIN_NET_EDGE_USD * 1.5
        ? "Edge is marginal; waiting for a larger batch or clearer fee savings could be better."
        : undefined,
    rebalanceReason: "cost_drag",
  };

  return { action: "proceed", recommendation };
}

/** Single-chain USDt spend (transfer) — must preserve configured reserve. */
export function evaluateUsdTSpend(input: {
  allocationByAsset: NestedAllocation;
  chain: string;
  amountUsd: number;
  totalPortfolioUsd: number;
  /** Typical EVM send gas in USD */
  gasEstimateUsd?: number;
  riskBudget?: RiskBudget;
}): { ok: true; gasUsd: number; usdtAfter: number } | { ok: false; reason: string } {
  const budget = input.riskBudget ?? DEFAULT_RISK_BUDGET;
  const avail = usdtOnChain(input.allocationByAsset, input.chain);
  const gas = input.gasEstimateUsd ?? 2.5;
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    return { ok: false, reason: "Invalid amount." };
  }
  if (input.amountUsd < 5) {
    return { ok: false, reason: "Amount is too small versus typical gas — avoid burning fees on micro-transfers." };
  }
  const minKeep = minUsdTKeepOnChainUsd(avail);
  const after = avail - input.amountUsd;
  if (after < minKeep) {
    return {
      ok: false,
      reason: `Would leave less than ~$${Math.round(minKeep)} USDt on ${input.chain} (local reserve for fees and liquidity).`,
    };
  }
  const totalUsdt = Object.values(input.allocationByAsset).reduce((s, row) => s + (row?.USDt ?? 0), 0);
  if (globalUsdTReserveBreached(totalUsdt - input.amountUsd, input.totalPortfolioUsd, budget)) {
    return {
      ok: false,
      reason: `Would push total USDt below ~${Math.round(budget.minUsdTReserveFraction * 100)}% of portfolio NAV.`,
    };
  }
  if (gas > input.amountUsd * 0.15) {
    return {
      ok: false,
      reason: "Gas is a large fraction of this transfer — batch or wait for lower base fee.",
    };
  }
  return { ok: true, gasUsd: gas, usdtAfter: after };
}

export function assertCanApplyTransfer(input: {
  allocation: Record<string, number>;
  allocationByAsset: NestedAllocation;
  fromChain: string;
  toChain: string;
  amountUsd: number;
  asset: "USDt" | "XAUt";
  expectedBenefitUsd?: number;
}): { ok: true } | { ok: false; reason: string } {
  const d = evaluateBridgeMove({
    allocation: input.allocation,
    allocationByAsset: input.allocationByAsset,
    fromChain: input.fromChain,
    toChain: input.toChain,
    amountUsd: input.amountUsd,
    asset: input.asset,
    expectedBenefitUsd: input.expectedBenefitUsd,
  });
  if (d.action === "hold") return { ok: false, reason: d.reason };
  return { ok: true };
}
