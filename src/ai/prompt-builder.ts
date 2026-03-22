import type { ClawIntentDetection } from "@/ai/intent-detector";
import type { NestedAllocation, Transaction } from "@/types";

/** Summarised wallet + policy context — not raw logs (token-capped). */
export type WalletSnapshot = {
  totalValueUsd: number;
  /** Top chains by USD notional */
  allocationByChain: Record<string, number>;
  /** chain → asset → usd */
  allocationByAsset: NestedAllocation;
  recentTransactions: Array<{
    type: string;
    asset: string;
    amount: number;
    chain: string;
    age: string;
  }>;
  connectedChains: string[];
  riskProfile: "safe" | "balanced" | "aggressive";
  /** Spending / policy hints */
  dailyLimitUsd?: number;
  maxSingleTxUsd?: number;
};

export type CoreSystemConfig = {
  /** Identity line — can be swapped in tests */
  identity?: string;
  /** Static APY reference table — model must not invent APYs outside this unless labeled “example”. */
  demoApyConfig: Record<string, { protocol: string; chain: string; asset: string; apyPercent: number }>;
};

export const DEFAULT_DEMO_APY_CONFIG: CoreSystemConfig["demoApyConfig"] = {
  aave_arb_usdt: { protocol: "Aave", chain: "arbitrum", asset: "USDT", apyPercent: 3.2 },
  aave_poly_usdt: { protocol: "Aave", chain: "polygon", asset: "USDT", apyPercent: 2.9 },
  curve_eth_usdt: { protocol: "Curve", chain: "ethereum", asset: "USDT", apyPercent: 2.1 },
};

const DEFAULT_IDENTITY =
  "You are ClawGPT, a cautious, highly reliable AI financial navigator for multi-chain wallets powered by Tether WDK. You never execute real-money actions without explicit confirmation.";

const SKILLS_LIBRARY = `
## Navigator skills (label skill_label in JSON output)
- **skill_portfolio_overview**: Group by chain + asset; highlight top 2 chains by value; call out idle balances (no yield).
- **skill_yield_scan**: For OPTIMIZE_YIELD — rank top 3 options using ONLY demoApyConfig numbers; show chain, protocol, asset, APY, est. yearly earnings on the notional discussed. Never propose deploying more than 80% of total portfolio value in one strategy.
- **skill_risk_profile**: Map riskProfile to max % per protocol: Safe → conservative (Aave-style only, low per-protocol cap); Balanced → mixed; Aggressive → may include DEX pools — still obey protocol whitelist from environment.
- **skill_explain_gas**: Use concrete numbers; compare L1 vs L2 using wallet snapshot where possible.
`.trim();

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function buildWalletSnapshotFromState(input: {
  totalValue: number;
  allocation: Record<string, number>;
  allocationByAsset: NestedAllocation;
  transactions: Transaction[];
  chains: string[];
  riskProfile?: "safe" | "balanced" | "aggressive";
  dailyLimitUsd?: number;
  maxSingleTxUsd?: number;
}): WalletSnapshot {
  const recent = input.transactions
    .slice(-8)
    .map((tx) => ({
      type: tx.type,
      asset: tx.asset,
      amount: tx.amount,
      chain: tx.fromChain,
      age: `${Math.max(0, Math.round((Date.now() - tx.timestamp) / 3600_000))}h`,
    }));

  return {
    totalValueUsd: input.totalValue,
    allocationByChain: { ...input.allocation },
    allocationByAsset: input.allocationByAsset,
    recentTransactions: recent,
    connectedChains: [...input.chains],
    riskProfile: input.riskProfile ?? "balanced",
    dailyLimitUsd: input.dailyLimitUsd,
    maxSingleTxUsd: input.maxSingleTxUsd,
  };
}

function formatSnapshot(snapshot: WalletSnapshot): string {
  const chains = Object.entries(snapshot.allocationByChain)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c, v]) => `${c}: ~$${Math.round(v).toLocaleString()}`)
    .join("; ");

  const assets = Object.entries(snapshot.allocationByAsset)
    .map(([chain, m]) => {
      const parts = Object.entries(m).map(([a, v]) => `${a} ~$${Math.round(v)}`);
      return `${chain}{${parts.join(", ")}}`;
    })
    .join(" | ");

  const txs = snapshot.recentTransactions
    .slice(-5)
    .map((t) => `${t.type} ${t.amount} ${t.asset} on ${t.chain} (${t.age} ago)`)
    .join("; ");

  return [
    `Total NAV (cockpit store): ~$${Math.round(snapshot.totalValueUsd).toLocaleString()}`,
    `Per-chain USD: ${chains || "(none)"}`,
    `Per-chain assets: ${truncate(assets, 900)}`,
    `Recent activity (last few): ${txs || "none"}`,
    `Connected chains: ${snapshot.connectedChains.join(", ") || "unknown"}`,
    `Risk profile: ${snapshot.riskProfile}`,
    snapshot.maxSingleTxUsd != null ? `Max single tx (policy hint): $${snapshot.maxSingleTxUsd}` : "",
    snapshot.dailyLimitUsd != null ? `Daily limit (policy hint): $${snapshot.dailyLimitUsd}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatApyConfig(cfg: CoreSystemConfig["demoApyConfig"]): string {
  return Object.entries(cfg)
    .map(
      ([k, v]) =>
        `${k}: ${v.protocol} on ${v.chain} ${v.asset} — APY ${v.apyPercent}% (reference table; do not fabricate other APYs)`,
    )
    .join("\n");
}

/**
 * Layered prompt: system + environment + user (+ optional parsed intent).
 */
export function buildClawPrompt(input: {
  system: CoreSystemConfig;
  context: WalletSnapshot;
  userMessage: string;
  parsedIntent?: ClawIntentDetection;
  conversationSummary?: string;
}): string {
  const { system, context, userMessage, parsedIntent, conversationSummary } = input;

  const intentLine = parsedIntent
    ? `Detected intent (heuristic): ${parsedIntent.intent} (confidence ~${parsedIntent.confidence.toFixed(2)}). Entities: amounts=${JSON.stringify(parsedIntent.entities.amounts)} assets=${JSON.stringify(parsedIntent.entities.assets)} chains=${JSON.stringify(parsedIntent.entities.chains)}. ${parsedIntent.entities.notes.join(" ")}`
    : "";

  const summaryBlock = conversationSummary?.trim()
    ? `## Conversation summary (rolling — not full transcript)\n${truncate(conversationSummary, 2000)}\nRespect the latest user correction; older numbers may be obsolete.`
    : "";

  return [
    `# ${system.identity || DEFAULT_IDENTITY}`,
    "",
    "## Scope",
    "Focus on: balances, transaction explanations, yield opportunities, risks, gas costs, and next steps.",
    "Never give tax, legal, or personalized investment advice; explain options and trade-offs.",
    "",
    "## Style",
    "Short, direct, numbered steps when proposing actions. Use concrete numbers (e.g. “~4.2 USDT in gas”) not vague claims.",
    "",
    "## Safety",
    "If data is missing (e.g. unknown balance), say so and say how the user can fetch it in the app.",
    "You must decide if the detected intent matches the user; if not, ask one clarifying question before suggesting actions.",
    "",
    "## Simulation vs execution",
    "- mode \"analysis\": explain, calculate, simulate only.",
    "- mode \"action_proposal\": concrete multi-step plan; requires_confirmation MUST be true for anything that could move funds. Never claim on-chain execution occurred.",
    "",
    "## Financial reasoning",
    "Always ground amounts in the wallet snapshot below — never assume funds the user does not have.",
    "If a request exceeds available balance, state current balance on the relevant chain, the gap, and alternatives (top up, smaller amount, bridge).",
    "Separate facts (balances, APYs from reference APY config) vs assumptions (e.g. “if gas stays low”).",
    "",
    "## JSON contract (dev)",
    "When the product requests JSON mode, return a single JSON object matching the client schema (v=1, mode, blocks, footer_disclaimer, etc.). No markdown outside JSON in JSON mode.",
    "Never fabricate APYs — use the reference APY table only, or label numbers explicitly as illustrative examples.",
    "",
    SKILLS_LIBRARY,
    "",
    "## Reference APY config (authoritative for yield copy)",
    formatApyConfig(system.demoApyConfig ?? DEFAULT_DEMO_APY_CONFIG),
    "",
    "## Environment: wallet snapshot (WDK / cockpit)",
    formatSnapshot(context),
    "",
    summaryBlock,
    "",
    "## User message",
    truncate(userMessage, 8000),
    "",
    intentLine,
  ]
    .filter((x) => x !== "")
    .join("\n");
}

export function defaultCoreSystemConfig(): CoreSystemConfig {
  return {
    identity: DEFAULT_IDENTITY,
    demoApyConfig: DEFAULT_DEMO_APY_CONFIG,
  };
}
