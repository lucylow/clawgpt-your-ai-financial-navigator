import type { NestedAllocation } from "@/types";

export type ChainAttributionRow = {
  chain: string;
  usdt: number;
  xaut: number;
  total: number;
  shareOfNav: number;
  /** This chain's USDt as % of portfolio-wide USDt. */
  usdtShareOfAssetClass: number;
  /** This chain's XAUt as % of portfolio-wide XAUt. */
  xautShareOfAssetClass: number;
};

export type PortfolioAttribution = {
  totalNav: number;
  totalUsdt: number;
  totalXaut: number;
  usdtPctOfNav: number;
  xautPctOfNav: number;
  /** Sorted by total descending. */
  byChain: ChainAttributionRow[];
  /** Chains holding >40% of NAV (concentration). */
  concentrationFlags: string[];
};

/**
 * Breaks NAV into chain × sleeve (USDt reserve vs XAUt hedge) for cockpit tables.
 */
export function computePortfolioAttribution(
  allocation: Record<string, number>,
  allocationByAsset: NestedAllocation,
): PortfolioAttribution {
  let totalNav = 0;
  let totalUsdt = 0;
  let totalXaut = 0;
  const chainKeys = new Set([...Object.keys(allocation), ...Object.keys(allocationByAsset)]);

  for (const k of chainKeys) {
    const row = allocationByAsset[k];
    const u = row?.USDt ?? 0;
    const x = row?.XAUt ?? 0;
    totalUsdt += u;
    totalXaut += x;
  }
  totalNav = totalUsdt + totalXaut;
  if (totalNav <= 0) {
    return {
      totalNav: 0,
      totalUsdt: 0,
      totalXaut: 0,
      usdtPctOfNav: 0,
      xautPctOfNav: 0,
      byChain: [],
      concentrationFlags: [],
    };
  }

  const usdtPctOfNav = totalUsdt / totalNav;
  const xautPctOfNav = totalXaut / totalNav;

  const byChain: ChainAttributionRow[] = [];
  for (const chain of chainKeys) {
    const usdt = allocationByAsset[chain]?.USDt ?? 0;
    const xaut = allocationByAsset[chain]?.XAUt ?? 0;
    const sumAssets = usdt + xaut;
    const navFromAlloc = allocation[chain];
    const nav =
      typeof navFromAlloc === "number" && Number.isFinite(navFromAlloc) && navFromAlloc > 0
        ? navFromAlloc
        : sumAssets;
    if (nav <= 0) continue;
    byChain.push({
      chain,
      usdt,
      xaut,
      total: nav,
      shareOfNav: nav / totalNav,
      usdtShareOfAssetClass: totalUsdt > 0 ? usdt / totalUsdt : 0,
      xautShareOfAssetClass: totalXaut > 0 ? xaut / totalXaut : 0,
    });
  }

  byChain.sort((a, b) => b.total - a.total);

  const concentrationFlags = byChain.filter((r) => r.shareOfNav > 0.4).map((r) => r.chain);

  return {
    totalNav,
    totalUsdt,
    totalXaut,
    usdtPctOfNav,
    xautPctOfNav,
    byChain,
    concentrationFlags,
  };
}
