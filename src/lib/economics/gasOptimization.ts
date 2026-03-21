import { estimateBridgeExecutionCostUsd } from "./executionCost";
import type { ExecutionCost } from "./types";

export interface ChainRecommendation {
  chain: string;
  /** Relative gas / fee score (higher = cheaper execution for this notional) */
  score: number;
  estimatedCostUsd: number;
  gasPriceLabel: string;
  notes?: string;
}

/** Heuristic multi-chain cost ranking for demo / policy (not live oracle gas). */
export function findOptimalExecutionChain(params: {
  chains: readonly string[];
  notionalUsd: number;
  asset: "USDt" | "XAUt";
  /** Optional: from chain for bridge envelope */
  fromChain?: string;
}): ChainRecommendation[] {
  const from = params.fromChain ?? params.chains[0] ?? "ethereum";
  const rows = params.chains.map((chain) => {
    const bridge = estimateBridgeExecutionCostUsd({
      fromChain: from,
      toChain: chain,
      notionalUsd: params.notionalUsd,
      asset: params.asset,
    });
    const cost = chain === from ? bridge.gasUsd : bridge.totalUsd;
    const score = params.notionalUsd > 0 ? params.notionalUsd / (cost + 0.25) : 0;
    return {
      chain,
      score,
      estimatedCostUsd: Math.round(cost * 100) / 100,
      gasPriceLabel: chain === "arbitrum" ? "low L2" : chain === "polygon" ? "moderate L2" : "L1 / variable",
      notes: bridge.notes,
    } satisfies ChainRecommendation;
  });
  return [...rows].sort((a, b) => b.score - a.score);
}
