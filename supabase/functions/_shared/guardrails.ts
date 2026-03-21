import { getPortfolioTotal } from "./demoData.ts";

export const GUARDRAILS = {
  maxDailySpendPct: 10,
  maxSingleTxPct: 25,
  minReserveUsdT: 0.08,
  maxGasToAmountRatio: 0.05,
  maxSlippageBps: 100,
  whitelistedProtocols: ["aave", "uniswap"],
} as const;

export function riskAssessment(
  amount: number,
  portfolioTotal: number,
  gasUsd: number,
): {
  level: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
  reasons: string[];
} {
  const reasons: string[] = [];
  let level: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED" = "LOW";

  const pct = portfolioTotal > 0 ? (amount / portfolioTotal) * 100 : 100;
  if (pct > GUARDRAILS.maxSingleTxPct) {
    reasons.push(`Amount is ${pct.toFixed(1)}% of portfolio (limit: ${GUARDRAILS.maxSingleTxPct}%)`);
    level = "BLOCKED";
  } else if (pct > GUARDRAILS.maxDailySpendPct) {
    reasons.push(`Amount is ${pct.toFixed(1)}% of portfolio (caution threshold: ${GUARDRAILS.maxDailySpendPct}%)`);
    level = "HIGH";
  }

  if (amount > 0 && gasUsd / amount > GUARDRAILS.maxGasToAmountRatio) {
    reasons.push(`Gas (~$${gasUsd.toFixed(2)}) is ${((gasUsd / amount) * 100).toFixed(1)}% of amount`);
    if (level !== "BLOCKED") level = "HIGH";
  }

  if (reasons.length === 0) reasons.push("Within normal parameters");
  return { level, reasons };
}

export function riskAssessmentWithDemoPortfolio(amount: number, gasUsd: number) {
  return riskAssessment(amount, getPortfolioTotal(), gasUsd);
}
