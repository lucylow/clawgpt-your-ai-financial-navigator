/** Demo portfolio for edge tool execution (no real wallet; aligns with cockpit demo store). */
export const DEMO_PORTFOLIO: Record<string, { USDt: number; XAUt: number }> = {
  ethereum: { USDt: 3200, XAUt: 2000 },
  polygon: { USDt: 2100, XAUt: 1000 },
  arbitrum: { USDt: 1650, XAUt: 500 },
  solana: { USDt: 1200, XAUt: 0 },
  tron: { USDt: 500, XAUt: 0 },
  ton: { USDt: 200, XAUt: 0 },
};

/** Synthetic 7d-ago snapshot for movement summaries (demo). */
export const PORTFOLIO_7D_AGO: Record<string, { USDt: number; XAUt: number }> = {
  ethereum: { USDt: 3050, XAUt: 1980 },
  polygon: { USDt: 1980, XAUt: 980 },
  arbitrum: { USDt: 1400, XAUt: 480 },
  solana: { USDt: 1150, XAUt: 0 },
  tron: { USDt: 520, XAUt: 0 },
  ton: { USDt: 180, XAUt: 0 },
};

export function getPortfolioTotal(): number {
  return Object.values(DEMO_PORTFOLIO).reduce((s, v) => s + v.USDt + v.XAUt, 0);
}
