/**
 * Central Tether asset + chain metadata for the agent backend.
 * Aligns with WDK registration keys used in `src/config/wdk.ts`.
 */

export const SUPPORTED_CHAINS = [
  "ethereum",
  "polygon",
  "arbitrum",
  "solana",
  "tron",
  "ton",
] as const;

export type AgentChainId = (typeof SUPPORTED_CHAINS)[number];

/** Canonical symbols returned in typed balance maps. */
export type TetherAssetSymbol = "USDT" | "USAT" | "XAUT";

export const TETHER_DECIMALS: Record<"USDT" | "USAT" | "XAUT", number> = {
  USDT: 6,
  USAT: 6,
  XAUT: 6,
};

/** Maps user/agent strings to canonical symbols. */
export function normalizeAssetSymbol(input: string): TetherAssetSymbol | null {
  const u = input.trim().toUpperCase().replace(/₮/g, "T");
  if (u === "USDT" || u === "USDT0") return "USDT";
  if (u === "USAT" || u === "USA" || u === "USATT") return "USAT";
  if (u === "XAUT" || u === "XAU" || u === "XAUt") return "XAUT";
  return null;
}

export type ChainBalanceRow = {
  USDT: string;
  USAT?: string;
  XAUT?: string;
};

export type MultiChainBalances = Record<AgentChainId, ChainBalanceRow>;

/** DeFi protocol identifiers for risk scoring (see safety.service). */
export const PROTOCOL_RISK: Record<string, "low" | "medium" | "high"> = {
  aave: "low",
  uniswap_v3: "medium",
  curve: "medium",
  unknown_dex: "high",
  bridge_generic: "medium",
};
