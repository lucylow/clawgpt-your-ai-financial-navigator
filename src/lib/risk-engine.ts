import { DEFAULT_RISK_BUDGET } from "@/lib/economics/constants";
import { totalPortfolioUsd, usdtOnChain } from "@/lib/economics/portfolioPolicy";
import type { NestedAllocation } from "@/types";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type RiskRecommendation = "SAFE" | "REVIEW" | "BLOCK";

export interface ProposedTx {
  amountUsd: number;
  to: string;
  chain: string;
  gasEstimateUsd: number;
  /** Cumulative spend today (optional — defaults to 0) */
  spentTodayUsd?: number;
  /** Max daily notional (defaults from env or 25_000) */
  dailyLimitUsd?: number;
  allocation?: Record<string, number>;
  allocationByAsset?: NestedAllocation;
}

export interface RiskScore {
  overall: RiskLevel;
  recommendation: RiskRecommendation;
  individual: Array<{ level: RiskLevel; reason: string }>;
}

function envDailyLimit(): number {
  const raw = import.meta.env.VITE_DAILY_SPEND_LIMIT_USD;
  const n = raw != null && String(raw).trim() !== "" ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 25_000;
}

/** Simple recipient reputation: new / short addresses score lower */
function recipientReputation(to: string): number {
  const t = to.trim();
  if (!t) return 0.3;
  if (t.startsWith("0x") && t.length >= 42) return 0.95;
  if (t.length >= 32) return 0.85;
  return 0.65;
}

/** Stub protocol risk by address length / prefix (demo — replace with allowlist) */
function protocolRiskScore(_to: string): number {
  return 0.15;
}

/**
 * Pre-flight risk assessment for transfers (spend limits, gas ratio, protocol stub, recipient).
 */
export function assessTransaction(tx: ProposedTx): RiskScore {
  const risks: Array<{ level: RiskLevel; reason: string }> = [];
  const daily = tx.dailyLimitUsd ?? envDailyLimit();
  const spent = tx.spentTodayUsd ?? 0;

  if (tx.amountUsd + spent > daily) {
    risks.push({ level: "HIGH", reason: `Exceeds daily limit (~$${daily.toLocaleString()})` });
  }

  if (tx.amountUsd > 0 && tx.gasEstimateUsd > tx.amountUsd * 0.01) {
    risks.push({ level: "MEDIUM", reason: "Gas is high relative to notional (>1%)" });
  }

  const proto = protocolRiskScore(tx.to);
  const maxProto = 0.35 + (1 - DEFAULT_RISK_BUDGET.maxChainWeight) * 0.2;
  if (proto > maxProto) {
    risks.push({ level: "HIGH", reason: `Protocol risk estimate high (${(proto * 100).toFixed(0)}%)` });
  }

  const rep = recipientReputation(tx.to);
  if (rep < 0.7) {
    risks.push({ level: "MEDIUM", reason: "Recipient looks unfamiliar — double-check address" });
  }

  if (tx.allocation && tx.allocationByAsset && tx.chain) {
    const nav = totalPortfolioUsd(tx.allocation);
    const usdt = usdtOnChain(tx.allocationByAsset, tx.chain);
    if (nav > 0 && tx.amountUsd > usdt * 0.95) {
      risks.push({ level: "HIGH", reason: "Amount approaches on-chain USDt availability" });
    }
  }

  const hasHigh = risks.some((r) => r.level === "HIGH");
  const hasMed = risks.some((r) => r.level === "MEDIUM");
  const overall: RiskLevel = hasHigh ? "HIGH" : hasMed ? "MEDIUM" : "LOW";
  let recommendation: RiskRecommendation = "SAFE";
  if (hasHigh) recommendation = risks.some((r) => r.reason.includes("daily")) ? "BLOCK" : "REVIEW";
  else if (hasMed) recommendation = "REVIEW";

  return { overall, individual: risks, recommendation };
}
