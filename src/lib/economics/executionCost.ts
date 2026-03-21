import type { ExecutionCost, SlippageEstimate } from "./types";

/** Rough gas + bridge envelope by route class (not chain-specific oracle data). */
export function estimateBridgeExecutionCostUsd(params: {
  fromChain: string;
  toChain: string;
  /** Notional in USD */
  notionalUsd: number;
  asset: "USDt" | "XAUt";
}): ExecutionCost {
  const sameLayer = params.fromChain === params.toChain;
  if (sameLayer) {
    return {
      totalUsd: 0.8,
      gasUsd: 0.8,
      protocolFeesUsd: 0,
      notes: "Same-chain move: gas only (estimate).",
    };
  }

  const isGold = params.asset === "XAUt";
  const baseBridge = isGold ? 18 : 9;
  const sizePremium = Math.min(22, Math.max(0, (params.notionalUsd / 50_000) * 8));
  const total = baseBridge + sizePremium + (isGold ? 4 : 0);

  return {
    totalUsd: total,
    gasUsd: isGold ? 6 : 4,
    protocolFeesUsd: isGold ? 3 : 2,
    bridgeRelayerUsd: total - (isGold ? 9 : 6),
    notes: isGold
      ? "Gold-pegged tokens: wider spread + liquidity; assume higher bridge + slippage risk."
      : "Stable USDt bridge: dominated by relayer + L1/L2 gas.",
  };
}

export function estimateSwapSlippage(params: {
  fromAsset: "USDt" | "XAUt";
  toAsset: "USDt" | "XAUt";
  notionalUsd: number;
}): SlippageEstimate {
  const pairVolatility = params.fromAsset !== params.toAsset;
  let bps = 8;
  if (pairVolatility) {
    bps = params.fromAsset === "XAUt" || params.toAsset === "XAUt" ? 45 : 18;
  }
  if (params.notionalUsd > 25_000) bps += Math.min(40, Math.round(params.notionalUsd / 5000));
  const label =
    bps < 15 ? "≤ ~0.15% vs mid" : bps < 35 ? "≤ ~0.35% vs mid" : "≤ ~0.6%+ vs mid (use TWAP if large)";
  return { basisPoints: bps, priceImpactLabel: label };
}

export function estimateFeeRunwayMonths(params: {
  /** Spendable USDt after any move */
  usdtLiquidUsd: number;
  /** Expected monthly on-chain activity cost */
  expectedMonthlyFeesUsd: number;
}): number {
  if (params.expectedMonthlyFeesUsd <= 0) return Infinity;
  return params.usdtLiquidUsd / params.expectedMonthlyFeesUsd;
}
