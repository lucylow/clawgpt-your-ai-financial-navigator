import { CHAIN_CONFIGS } from "../chainConfig.ts";
import { getPortfolioTotal } from "../demoData.ts";
import { numArg, strArg } from "../toolArgs.ts";
import type { PolicyContext } from "./types.ts";

const EXECUTION_ACTIONS = new Set([
  "transfer_tokens",
  "bridge_tokens",
  "swap_tokens",
  "aave_deposit",
  "aave_withdraw",
  "outbound_preview",
]);

export function isFinancialExecutionAction(action: string): boolean {
  return EXECUTION_ACTIONS.has(action);
}

export function getPolicyAmount(ctx: PolicyContext): number {
  if (ctx.action === "outbound_preview") {
    const raw = ctx.params.amountUsd;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    return numArg(ctx.params, "amountUsd", 0);
  }
  return numArg(ctx.params, "amount", 0);
}

export function getPortfolioNavUsd(ctx: PolicyContext): number {
  const s = ctx.state?.portfolioNavUsd;
  if (typeof s === "number" && Number.isFinite(s)) return s;
  return getPortfolioTotal();
}

export function getGasUsdForContext(ctx: PolicyContext): number {
  const g = ctx.state?.gasUsd;
  if (typeof g === "number" && Number.isFinite(g)) return g;
  const chain = strArg(ctx.params, "chain") || strArg(ctx.params, "from_chain");
  const from = CHAIN_CONFIGS[chain];
  if (ctx.action === "bridge_tokens") {
    const to = strArg(ctx.params, "to_chain");
    const a = CHAIN_CONFIGS[chain];
    const b = CHAIN_CONFIGS[to];
    if (a && b) return a.gasAvgUsd + b.gasAvgUsd + 2.5;
  }
  return from?.gasAvgUsd ?? 2;
}

export function getChainAndAsset(
  ctx: PolicyContext,
): { chain: string; asset: "USDt" | "XAUt" } | null {
  const chain =
    strArg(ctx.params, "chain") ||
    strArg(ctx.params, "from_chain") ||
    (ctx.state?.chainKey as string | undefined) ||
    "";
  const assetRaw = strArg(ctx.params, "asset") || strArg(ctx.params, "from_asset");
  const asset = assetRaw === "XAUt" ? "XAUt" : assetRaw === "USDt" ? "USDt" : "";
  if (!chain || !CHAIN_CONFIGS[chain] || (asset !== "USDt" && asset !== "XAUt")) return null;
  return { chain, asset };
}
