import { SUPPORTED_WDK_CHAINS } from "@/config/chains";
import { totalPortfolioUsd } from "@/lib/economics/portfolioPolicy";
import { usePortfolioStore } from "@/store/usePortfolioStore";

export interface YieldOpportunity {
  type: "yield_optimization";
  chain: string;
  potentialApy: number;
  estimatedEarningsUsd: number;
}

export interface PortfolioAnalysis {
  totalValueUsd: number;
  totalUsdT: number;
  totalXautUsd: number;
  riskScoreLabel: "low" | "medium" | "high";
  opportunities: YieldOpportunity[];
  recommendations: string[];
}

function concentrationRisk(allocation: Record<string, number>, total: number): number {
  if (total <= 0) return 0;
  const vals = Object.values(allocation).map((v) => (Number.isFinite(v) ? v : 0));
  if (vals.length === 0) return 0;
  const max = Math.max(...vals);
  return max / total;
}

/**
 * OpenClaw-style skill: read-only snapshot of portfolio + heuristic opportunities (no chain execution).
 */
export class PortfolioAnalyzerSkill {
  static analyze(): PortfolioAnalysis {
    const st = usePortfolioStore.getState();
    const allocation = st.allocation ?? {};
    const nested = st.allocationByAsset ?? {};
    let totalUsdT = 0;
    let totalXautUsd = 0;
    for (const row of Object.values(nested)) {
      totalUsdT += row?.USDt ?? 0;
      totalXautUsd += row?.XAUt ?? 0;
    }
    const totalValueUsd = totalPortfolioUsd(allocation);
    const conc = concentrationRisk(allocation, totalValueUsd);
    const riskScoreLabel: PortfolioAnalysis["riskScoreLabel"] =
      conc > 0.5 ? "high" : conc > 0.35 ? "medium" : "low";

    const opportunities: YieldOpportunity[] = [];
    for (const chain of SUPPORTED_WDK_CHAINS) {
      const usdt = nested[chain]?.USDt ?? 0;
      if (usdt > 1000) {
        const potentialApy = 4.2;
        opportunities.push({
          type: "yield_optimization",
          chain,
          potentialApy,
          estimatedEarningsUsd: Math.round(usdt * (potentialApy / 100) * 100) / 100,
        });
      }
    }

    const recommendations: string[] = [];
    if (conc > 0.45) {
      recommendations.push("Consider spreading exposure across more chains (concentration risk).");
    }
    if (totalUsdT > totalXautUsd * 3) {
      recommendations.push("Liquidity-heavy — XAUt hedge sleeve may be underweight vs goals.");
    }
    if (opportunities.length > 0) {
      recommendations.push("Idle or sub-yield USDt detected — review bridge + lending options on L2.");
    }

    return {
      totalValueUsd,
      totalUsdT: Math.round(totalUsdT * 100) / 100,
      totalXautUsd: Math.round(totalXautUsd * 100) / 100,
      riskScoreLabel,
      opportunities,
      recommendations,
    };
  }
}
