import { streamAgentMessage, type AgentMetadata } from "@/lib/agent";
import { trackAgentChatTurn } from "@/lib/observability";
import { isSupabaseConfigured } from "@/lib/supabaseEnv";
import { buildDemoTransferSafety, buildSafetyFromAgentMetadata } from "@/lib/agentSafety";
import { assetRoleLabel } from "@/lib/economics/assetRoles";
import { estimateSwapSlippage } from "@/lib/economics/executionCost";
import {
  evaluateBridgeMove,
  evaluateUsdTSpend,
  projectedChainWeightsAfterBridge,
  totalPortfolioUsd,
} from "@/lib/economics/portfolioPolicy";
import type { AgentProposedPlan } from "@/lib/agentWorkflow";
import type { AgentPortfolioUpdate, ChatCardPayload } from "@/types";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { PortfolioAnalyzerSkill } from "@/lib/agent-skills";

export interface AgentClientResult {
  text: string;
  card?: ChatCardPayload;
  portfolioUpdate?: AgentPortfolioUpdate;
  /** Read-only tool output — does not mutate Zustand unless user confirms in UI. */
  portfolioPreview?: Record<string, unknown>;
  intent?: string;
  /** Structured plan for review before any on-chain execution (OpenClaw boundary). */
  proposedPlan?: AgentProposedPlan;
}

type HistoryMessage = { role: "user" | "assistant"; content: string };

/** Live Supabase agent: attach a confirm card when the model prepared an ERC-20 transfer. */
function transactionCardFromMetadata(metadata: AgentMetadata | undefined): ChatCardPayload | undefined {
  const ctx = metadata?.contractContext;
  if (!ctx || typeof ctx !== "object") return undefined;
  const action = String((ctx as { action?: string }).action ?? "");
  if (action !== "erc20_transfer") return undefined;

  const chain = String((ctx as { chain?: string }).chain ?? "");
  const to = (ctx as { to?: string }).to != null ? String((ctx as { to?: string }).to) : "";
  const amount = Number((ctx as { amount?: number }).amount);
  const asset = String((ctx as { asset?: string }).asset ?? "USDt");
  const safety =
    metadata?.safety ?? buildSafetyFromAgentMetadata({ contractContext: ctx, safety: metadata?.safety });

  return {
    kind: "transaction_ready",
    amount,
    asset,
    toLabel: to.length >= 10 ? `${to.slice(0, 6)}…${to.slice(-4)}` : "Recipient",
    chain,
    toAddress: to || undefined,
    feeEstimateUsd: safety.transactionSimulation.gasEstimateUsd,
    safety,
  };
}

/**
 * Resolves whether to use the local mock agent vs Supabase `agent-chat`.
 * - Explicit `VITE_USE_MOCK_AGENT=true` → mock (offline demos).
 * - Explicit `false` → live edge (requires LOVABLE_API_KEY on the function).
 * - Unset: live when Supabase URL + anon key are present; otherwise mock so the app works without backend.
 */
export function resolveMockAgentPreference(
  flag: string | undefined,
  supabaseConfigured: boolean,
): boolean {
  if (flag === "true") return true;
  if (flag === "false") return false;
  return !supabaseConfigured;
}

function isMockAgent(): boolean {
  return resolveMockAgentPreference(import.meta.env.VITE_USE_MOCK_AGENT, isSupabaseConfigured);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Rich mock responses for demos — exercises portfolio Q&A, cards, and store updates.
 */
async function mockSendMessage(content: string): Promise<AgentClientResult> {
  const q = content.toLowerCase();
  await delay(400 + Math.random() * 400);

  if (
    q.includes("compare") &&
    (q.includes("route") || q.includes("bridge") || q.includes("arbitrum") || q.includes("chain"))
  ) {
    return {
      text:
        "**Route comparison (demo model)**\n\n" +
        "| Route | Est. total | ETA | Notes |\n" +
        "|-------|------------|-----|-------|\n" +
        "| **Direct:** Ethereum → Arbitrum | ~$8–10 (gas + relay demo) | ~12–24h full exit | Canonical rollup path |\n" +
        "| **Via Polygon hub** (illustrative) | varies; extra hops | slower | Check live bridge quotes |\n\n" +
        "Use **compare_chain_routes** on the live agent for amounts and guardrails. Prefer audited bridges for size.",
      intent: "compare_routes",
    };
  }

  if (
    q.includes("gas") &&
    (q.includes("explain") || q.includes("why") || q.includes("arbitrum") || q.includes("ethereum") || q.includes("vs"))
  ) {
    return {
      text:
        "**Gas explainer**\n\n" +
        "• **Ethereum L1** — pays for scarce block space; spikes when demand is high.\n" +
        "• **Arbitrum / Polygon** — execution is much cheaper; you still pay **L1 data** for some operations but net is often **10–100× lower** than mainnet for the same contract class.\n" +
        "• **Swaps / bridges** cost more than simple sends because they run **more contract code**.\n\n" +
        "Compare **gas as % of your notional** — if fees are a large fraction of the trade, batch, wait, or use an L2.",
      intent: "explain_gas",
    };
  }

  if (q.includes("rebalanc") || (q.includes("target") && q.includes("usdt"))) {
    return {
      text:
        "**Rebalancing (demo policy)**\n\n" +
        "• Set a **target USDt %** of NAV (liquidity sleeve) — e.g. **65%** USDt / **35%** XAUt hedge.\n" +
        "• If drift is small (<~1–2%), **no trade** may be best.\n" +
        "• To raise USDt: swap **XAUt → USDt** on an AMM chain with good depth; watch slippage.\n" +
        "• To raise hedge: swap **USDt → XAUt**; keep **≥8%** USDt as operational reserve per cockpit guardrails.\n\n" +
        "Live agent: **suggest_rebalancing** + **risk_check** before execution.",
      intent: "rebalance",
      proposedPlan: {
        title: "Rebalance sleeves (review)",
        steps: [
          "Confirm target USDt % and current mix in Portfolio",
          "Size swaps/bridges to close the gap",
          "Run risk check and confirm in wallet",
        ],
        requiresOnChainConfirmation: true,
      },
    };
  }

  if (
    q.includes("movement") ||
    q.includes("what changed") ||
    q.includes("flows") ||
    (q.includes("summarize") && q.includes("portfolio"))
  ) {
    return {
      text:
        "**Portfolio movements (demo snapshot)**\n\n" +
        "Net flows vs a **7-day prior** model: USDt and XAUt shifted slightly toward **Arbitrum** and **Ethereum** in the demo store. Open **Transactions** for settlement detail; live history uses your wallet connection.\n\n" +
        "Ask the connected agent for a **full table** via **summarize_portfolio_movements**.",
      intent: "movements_summary",
    };
  }

  if (q.includes("draft") || (q.includes("plan") && (q.includes("transaction") || q.includes("yield")))) {
    return {
      text:
        "**Draft transaction plan (yield example)**\n\n" +
        "1. **Approve** USDt on your chosen chain (~1 gas unit).\n" +
        "2. **Deposit** to Aave (or similar whitelisted protocol) — second tx.\n" +
        "3. **Monitor** rates and health factor; keep exit liquidity for spending.\n\n" +
        "Live agent: **draft_transaction_plan** with goal `increase_yield` and your notional.",
      intent: "tx_plan",
      proposedPlan: {
        title: "Increase yield (staged)",
        steps: [
          "Approve token for lending pool",
          "Deposit and verify position in Cockpit",
          "Set alerts for rate / risk changes",
        ],
        requiresOnChainConfirmation: true,
      },
    };
  }

  if (q.includes("analyze") || q.includes("risk score") || q.includes("opportunities")) {
    const a = PortfolioAnalyzerSkill.analyze();
    const oppLines = a.opportunities
      .slice(0, 4)
      .map(
        (o) =>
          `• **${o.chain}**: ~$${o.estimatedEarningsUsd.toLocaleString()}/yr at ${o.potentialApy}% APY (model)`,
      )
      .join("\n");
    return {
      text:
        `**Portfolio analyzer (agent skill)**\n\n` +
        `• **NAV:** ~$${a.totalValueUsd.toLocaleString()}\n` +
        `• **USDt (liquidity):** $${a.totalUsdT.toLocaleString()}\n` +
        `• **XAUt (hedge):** $${a.totalXautUsd.toLocaleString()}\n` +
        `• **Concentration / sleeve risk:** **${a.riskScoreLabel}**\n\n` +
        (a.opportunities.length
          ? `**Idle / yield opportunities:**\n${oppLines}\n\n`
          : "**No idle USDt blocks flagged** over the demo threshold.\n\n") +
        (a.recommendations.length
          ? `**Recommendations:**\n${a.recommendations.map((r) => `• ${r}`).join("\n")}`
          : ""),
      intent: "portfolio_analysis",
    };
  }

  if (q.includes("recurring") || q.includes("dca")) {
    return {
      text: "I can set up a recurring buy. Review the plan below — you can adjust asset and frequency later when WDK is connected.",
      intent: "recurring_buy",
      proposedPlan: {
        title: "Recurring buy (schedule only)",
        steps: [
          "Choose asset and chain (USDt on Arbitrum in demos)",
          "Set amount per run and frequency",
          "Confirm schedule — execution requires WDK + confirmed automation",
        ],
        requiresOnChainConfirmation: false,
      },
      card: {
        kind: "recurring_wizard",
        asset: "USDt",
        frequency: "Weekly",
        steps: [
          "Choose asset (USDt on Arbitrum)",
          "Set amount per run ($25)",
          "Confirm schedule & gas budget",
        ],
      },
    };
  }

  if (q.includes("idle") || (q.includes("arbitrum") && q.includes("move"))) {
    const st = usePortfolioStore.getState();
    const fromChain = "ethereum";
    const toChain = "arbitrum";
    const amountUsd = 800;
    const asset = "USDt" as const;
    const decision = evaluateBridgeMove({
      allocation: st.allocation,
      allocationByAsset: st.allocationByAsset,
      fromChain,
      toChain,
      amountUsd,
      asset,
      /** Demo: user intent implies durable fee savings on L2; still gated by policy */
      expectedBenefitUsd: 120,
    });

    usePortfolioStore.getState().appendDecisionAudit({
      kind: decision.action === "hold" ? "hold" : "recommendation",
      summary:
        decision.action === "hold"
          ? `Hold bridge: ${decision.reason}`
          : `Bridge ${amountUsd} ${asset} ${fromChain}→${toChain}`,
      detail: { fromChain, toChain, amountUsd, asset },
    });

    if (decision.action === "hold") {
      return {
        text:
          `**Recommendation: hold.** ${decision.reason}\n\n` +
          "USD₮ is modeled as **liquidity / working capital** — we only suggest bridges when the net benefit after fees, slippage, and reserve rules clears a minimum edge.",
        intent: "idle_funds_hold",
      };
    }

    const r = decision.recommendation;
    const slip = estimateSwapSlippage({ fromAsset: asset, toAsset: asset, notionalUsd: amountUsd });
    const slippageUsd = (amountUsd * slip.basisPoints) / 10_000;
    const net = r.expectedBenefitUsd - r.executionCost.totalUsd - slippageUsd;
    const weights = projectedChainWeightsAfterBridge(st.allocation, fromChain, toChain, amountUsd);
    const card: Extract<ChatCardPayload, { kind: "opportunity" }> = {
      kind: "opportunity",
      summary: "USDt reserve could be deployed to a lower-fee execution chain",
      suggestedAction: `Bridge ${amountUsd} USDt → ${toChain} (review costs below)`,
      fromChain,
      toChain,
      amount: amountUsd,
      asset,
      policyBenefitUsd: 120,
      assetRoleLabel: assetRoleLabel("reserve"),
      costEstimateUsd: r.executionCost.totalUsd,
      expectedNetBenefitUsd: net,
      slippageBps: slip.basisPoints,
      confidence: r.confidence,
      whyNow: r.whyNow,
      whyNotNow: r.whyNotNow,
      principalRisks: r.principalRisks,
      liquidityImpact: r.liquidityImpact,
      diversificationDelta: r.diversificationDelta,
      postTradeChainWeights: weights,
    };

    return {
      text:
        `**USD₮ (liquidity sleeve):** moving **${amountUsd} USDt** from **${fromChain}** to **${toChain}** passes the cost / reserve checks.\n\n` +
        `• **Est. execution cost:** ~$${r.executionCost.totalUsd.toFixed(2)}  \n` +
        `• **Slippage (${slip.basisPoints} bps):** ~$${slippageUsd.toFixed(2)}  \n` +
        `• **Modeled net vs hold:** ~$${net.toFixed(2)}  \n` +
        `• **Confidence:** ${r.confidence}  \n\n` +
        `XAUt is treated separately as a **hedge sleeve** — this suggestion does not treat tokens as interchangeable.`,
      intent: "idle_funds",
      proposedPlan: {
        title: "Rebalance idle USDt (edge vs costs)",
        steps: [
          "Confirm source/target chains and amount",
          "Review bridge path (demo simulates allocation only)",
          "Reconcile balances after execution",
        ],
        requiresOnChainConfirmation: true,
      },
      card,
    };
  }

  if (q.includes("send") && (q.includes("sarah") || q.includes("50"))) {
    const envTo = import.meta.env.VITE_DEMO_TRANSFER_RECIPIENT?.trim();
    const st = usePortfolioStore.getState();
    const chain = "ethereum";
    const amount = 50;
    const total = totalPortfolioUsd(st.allocation);
    const spend = evaluateUsdTSpend({
      allocationByAsset: st.allocationByAsset,
      chain,
      amountUsd: amount,
      totalPortfolioUsd: total,
      gasEstimateUsd: 2.5,
    });

    usePortfolioStore.getState().appendDecisionAudit({
      kind: spend.ok ? "recommendation" : "rejection",
      summary: spend.ok ? `Prepared send ${amount} USDt on ${chain}` : (spend as { reason: string }).reason,
      detail: { chain, amount },
    });

    if (!spend.ok) {
      return {
        text: `**Not recommended:** ${(spend as { reason: string }).reason}`,
        intent: "transfer_blocked",
      };
    }

    return {
      text:
        "I've prepared a **testnet** transfer. **USD₮** is modeled as **spendable liquidity** — confirm only after reviewing estimated gas and remaining on-chain reserve.",
      intent: "transfer_ready",
      proposedPlan: {
        title: "Send USDt (EVM testnet)",
        steps: [
          "Validate amount and chain",
          "Preview recipient (from card or VITE_DEMO_TRANSFER_RECIPIENT)",
          "Execute via WDK, then reconcile portfolio",
        ],
        requiresOnChainConfirmation: true,
      },
      card: {
        kind: "transaction_ready",
        amount: 50,
        asset: "USDt",
        toLabel: "Sarah",
        chain,
        toAddress: envTo && envTo.startsWith("0x") ? envTo : undefined,
        feeEstimateUsd: spend.gasUsd,
        usdtAfterOnChain: spend.usdtAfter,
        reserveNote: "~8% local USDt floor preserved where possible",
        safety: buildDemoTransferSafety(
          chain,
          envTo && envTo.startsWith("0x") ? envTo : undefined,
          amount,
          "USDt",
          spend.gasUsd,
        ),
      },
    };
  }

  if (q.includes("portfolio") || q.includes("total") || q.includes("balance")) {
    return {
      text:
        "Your **total portfolio** is aggregated in the right-hand cockpit from the live store. Ask me to simulate a transfer or bridge to see the ticker and allocation react.",
      intent: "portfolio_summary",
    };
  }

  return {
    text:
      "I'm running in **demo mode** with mocked reasoning. Try:\n" +
      "- “Summarize portfolio movements” / “What changed?”\n" +
      "- “Suggest rebalancing to 65% USDt”\n" +
      "- “Draft a transaction plan for yield”\n" +
      "- “Explain gas on Arbitrum vs Ethereum”\n" +
      "- “Compare bridge routes ETH → Arbitrum”\n" +
      "- “Analyze portfolio risk” / “Send 50 USDT to Sarah” / “Move idle USDT to Arbitrum”",
    intent: "fallback",
  };
}

function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

async function streamToResult(
  content: string,
  history: HistoryMessage[]
): Promise<AgentClientResult> {
  let text = "";
  let metadata: AgentMetadata | undefined;
  const idempotencyKey = newIdempotencyKey();
  const correlationId = newIdempotencyKey();
  const t0 = Date.now();

  try {
    await new Promise<void>((resolve, reject) => {
      streamAgentMessage({
        content,
        history,
        idempotencyKey,
        correlationId,
        onDelta: (t) => {
          text += t;
        },
        onMetadata: (m) => {
          metadata = m;
        },
        onDone: () => resolve(),
        onError: (e) => reject(new Error(e)),
      });
    });
  } catch (e) {
    trackAgentChatTurn({
      ok: false,
      latencyMs: Date.now() - t0,
      correlationId,
    });
    throw e;
  }

  trackAgentChatTurn({
    ok: true,
    latencyMs: Date.now() - t0,
    correlationId: metadata?.correlationId ?? correlationId,
  });

  const portfolioUpdate = shouldApplyPortfolioMetadata(metadata)
    ? normalizePortfolioUpdate(metadata?.portfolioUpdate)
    : undefined;

  return {
    text,
    portfolioUpdate,
    portfolioPreview: metadata?.portfolioPreview,
    intent: undefined,
    card: transactionCardFromMetadata(metadata),
  };
}

/** Exported for tests — live agent only mutates portfolio when metadata opts in. */
export function shouldApplyPortfolioMetadata(meta: AgentMetadata | undefined): boolean {
  return meta?.applyPortfolioUpdate === true;
}

function normalizePortfolioUpdate(
  raw: Record<string, unknown> | undefined
): AgentPortfolioUpdate | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const t = (raw as { type?: string }).type;
  if (t === "transfer") {
    const fromChain = String((raw as { fromChain?: string }).fromChain ?? "");
    const toChain = String((raw as { toChain?: string }).toChain ?? "");
    const amount = Number((raw as { amount?: number }).amount);
    if (!fromChain || !toChain || !Number.isFinite(amount)) return undefined;
    return { type: "transfer", fromChain, toChain, amount };
  }
  return undefined;
}

/**
 * Single entry for chat: OpenClaw / LLM / Supabase will plug in behind this API.
 */
export async function sendMessage(
  text: string,
  history: HistoryMessage[]
): Promise<AgentClientResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { text: "Ask me anything about your portfolio.", intent: "empty" };
  }

  if (isMockAgent()) {
    try {
      return await mockSendMessage(trimmed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Demo agent failed.";
      return { text: `⚠️ ${msg}`, intent: "error" };
    }
  }

  try {
    return await streamToResult(trimmed, history);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Agent request failed.";
    return { text: `⚠️ ${msg}`, intent: "error" };
  }
}
