import type { RiskBudget } from "./types";

/** Default policy: capital preservation, explicit USDt reserve, concentration caps */
export const DEFAULT_RISK_BUDGET: RiskBudget = {
  maxChainWeight: 0.45,
  maxAssetWeight: 0.55,
  minUsdTReserveFraction: 0.08,
  minUsdTReserveUsdFloor: 200,
};

/** Minimum net expected benefit (after costs) to prefer acting over holding (USD) */
export const MIN_NET_EDGE_USD = 35;

/** Treat very small rebalances as churn */
export const MIN_REBALANCE_NOTIONAL_USD = 75;
