import { evaluateBridgeMove } from "./economics/portfolioPolicy";
import { findOptimalExecutionChain } from "./economics/gasOptimization";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import type { ChatCardPayload } from "@/types";
import { SUPPORTED_WDK_CHAINS } from "@/config/chains";

export type ProactiveInsight = {
  id: string;
  content: string;
  card?: ChatCardPayload;
};

function id() {
  return `proactive-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Prefer L2 when portfolio is large enough for gas arbitrage hints */
export function findOptimalGasChains(notionalUsd: number): ReturnType<typeof findOptimalExecutionChain> {
  return findOptimalExecutionChain({
    chains: [...SUPPORTED_WDK_CHAINS],
    notionalUsd,
    asset: "USDt",
    fromChain: "ethereum",
  });
}

/**
 * OpenClaw-style proactive scan: idle USDt, gas routing hints.
 * Returns at most one chat-ready insight per call (caller dedupes).
 */
export function scanProactiveInsights(): ProactiveInsight | null {
  const st = usePortfolioStore.getState();
  const total = Object.values(st.allocation ?? {}).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);

  for (const chain of SUPPORTED_WDK_CHAINS) {
    const usdt = st.allocationByAsset[chain]?.USDt ?? 0;
    if (usdt > 1000) {
      const toChain = "arbitrum";
      if (chain === toChain) continue;

      const decision = evaluateBridgeMove({
        allocation: st.allocation,
        allocationByAsset: st.allocationByAsset,
        fromChain: chain,
        toChain,
        amountUsd: Math.min(800, usdt * 0.2),
        asset: "USDt",
        expectedBenefitUsd: 90,
      });

      if (decision.action === "hold") continue;

      const amount = Math.round(Math.min(800, usdt * 0.15));
      const card: Extract<ChatCardPayload, { kind: "opportunity" }> = {
        kind: "opportunity",
        summary: "Idle USDT detected — lower-fee execution chain available",
        suggestedAction: `Bridge ${amount} USDt → ${toChain} (allocation preview)`,
        fromChain: chain,
        toChain,
        amount,
        asset: "USDt",
        policyBenefitUsd: 90,
        whyNow: "Portfolio scan: USDt on this chain exceeds idle threshold.",
        principalRisks: ["Bridge smart contract", "Temporary illiquidity"],
      };

      return {
        id: id(),
        content:
          `**Idle USDT detected** on **${chain}** (~$${Math.round(usdt).toLocaleString()}). ` +
          `Suggested: move **$${amount}** toward **${toChain}** for cheaper recurring execution (policy preview).`,
        card,
      };
    }
  }

  if (total > 5000) {
    const optimal = findOptimalGasChains(Math.min(total, 10_000));
    const best = optimal[0];
    const runner = optimal[1];
    if (best && runner && best.chain !== runner.chain) {
      return {
        id: id(),
        content:
          `**Gas routing:** for your portfolio size, **${best.chain}** looks cheaper than **${runner.chain}** ` +
          `(~$${best.estimatedCostUsd.toFixed(2)} vs ~$${runner.estimatedCostUsd.toFixed(2)} est.).`,
      };
    }
  }

  return null;
}

export type YieldStep = { name: string; desc: string };

/** Human-in-the-loop first step; remaining steps are stubs for future WDK automation */
export async function executeYieldOptimization(params: {
  amount: number;
  fromChain: string;
  toChain: string;
  requestApproval: (step: YieldStep) => Promise<boolean>;
  executeStep: (step: YieldStep) => Promise<void>;
  onProgress?: (done: number, total: number) => void;
}): Promise<{ success: boolean; cancelled?: boolean; apy?: number }> {
  const steps: YieldStep[] = [
    { name: "bridge", desc: `Bridge to ${params.toChain}` },
    { name: "approve", desc: "Approve lending pool spending" },
    { name: "deposit", desc: "Deposit to pool" },
  ];

  const ok = await params.requestApproval(steps[0]);
  if (!ok) return { success: false, cancelled: true };

  for (let i = 1; i < steps.length; i++) {
    await params.executeStep(steps[i]);
    params.onProgress?.(i + 1, steps.length);
  }

  return { success: true, apy: 4.2 };
}
