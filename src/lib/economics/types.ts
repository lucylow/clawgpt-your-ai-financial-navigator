/**
 * Economic semantics for portfolio state, constraints, and recommendations.
 * USDt = liquidity / settlement reserve; XAUt = hedge / store-of-value sleeve (not cash substitute).
 */

export type AssetRole =
  | "reserve" // spendable / working capital (primarily USDt)
  | "settlement" // same as reserve for routing clarity
  | "hedge" // XAUt and similar defensive sleeves
  | "growth" // risk-on / volatile exposure
  | "liability" // borrowed / short
  | "locked" // staking, vesting, illiquid
  | "speculative"; // high uncertainty / tactical

export type ConfidenceScore = "low" | "medium" | "high";

/** User-facing horizon for a recommendation */
export type HoldingDuration = "immediate" | "days" | "weeks" | "months" | "years";

export interface RiskBudget {
  /** Max fraction of portfolio in a single chain (0–1) */
  maxChainWeight: number;
  /** Max fraction in a single asset symbol (0–1) */
  maxAssetWeight: number;
  /** Minimum USDt as fraction of total portfolio value (0–1) */
  minUsdTReserveFraction: number;
  /** Absolute floor in USD for USDt reserve (handles tiny portfolios) */
  minUsdTReserveUsdFloor: number;
}

export interface LiquidityProfile {
  /** Fraction of position that can be exited within typical execution window (0–1) */
  immediacy: number;
  /** Qualitative depth label */
  depth: "deep" | "moderate" | "thin";
}

export interface ExecutionCost {
  /** All-in estimate in USD (gas + protocol + bridge relayer, where applicable) */
  totalUsd: number;
  gasUsd: number;
  protocolFeesUsd: number;
  bridgeRelayerUsd?: number;
  notes?: string;
}

export interface SlippageEstimate {
  basisPoints: number;
  /** Human-readable bound on execution price vs mid */
  priceImpactLabel: string;
}

export interface AllocationTarget {
  chain: string;
  asset: string;
  /** Target weight 0–1 of total portfolio */
  weight: number;
  role: AssetRole;
}

export type RebalanceReason =
  | "cost_drag"
  | "risk_concentration"
  | "reserve_violation"
  | "hedge_drift"
  | "user_goal"
  | "none";

export interface ScenarioOutcome {
  label: string;
  /** Relative to status quo, in USD (negative = loss) */
  expectedPnlUsd?: number;
  /** Max adverse move vs entry, USD */
  stressLossUsd?: number;
}

export interface PortfolioConstraint {
  id: string;
  description: string;
  satisfied: boolean;
}

/** Structured rationale for a portfolio move */
export interface FinancialRecommendation {
  expectedBenefitUsd: number;
  principalRisks: string[];
  executionCost: ExecutionCost;
  liquidityImpact: string;
  timeHorizon: HoldingDuration;
  confidence: ConfidenceScore;
  /** Plain-language: diversification improves / worsens / neutral */
  diversificationDelta: "improves" | "worsens" | "neutral";
  whyNow: string;
  whyNotNow?: string;
  rebalanceReason: RebalanceReason;
}

export interface DecisionAuditEntry {
  at: number;
  kind: "recommendation" | "execution" | "rejection" | "hold";
  summary: string;
  detail?: Record<string, unknown>;
}
