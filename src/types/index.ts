import type { AgentWorkflowEntry } from "@/lib/agentWorkflow";
import type { AgentSafetyEnvelope } from "@/lib/agentSafety";
import type { ConfidenceScore, DecisionAuditEntry } from "@/lib/economics/types";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Structured UI for assistant messages */
  card?: ChatCardPayload;
  /** Step index for recurring_wizard cards (UI-controlled) */
  wizardStep?: number;
}

export interface MessageAction {
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface Transaction {
  hash: string;
  type: "send" | "receive" | "swap" | "bridge";
  amount: number;
  asset: "USDt" | "XAUt";
  fromChain: string;
  toChain: string;
  toAddress: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
}

/** Display model for the live transaction ticker (UI + pulse feed) */
export type TickerTxType = "sent" | "received" | "deposit" | "withdraw" | "bridge" | "swap";

export interface TickerTransaction {
  id: string;
  type: TickerTxType;
  asset: string;
  amount: number;
  chain: string;
  /** Counterparty or destination label (truncated in UI) */
  to?: string;
  hash: string;
  gas: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
  age: string;
  /** Bridge / multi-hop: optional second chain label */
  chainTo?: string;
}

/** Nested allocation: chain → asset → USD notional */
export type NestedAllocation = Record<string, Record<string, number>>;

export type ChatCardPayload =
  | {
      kind: "transaction_ready";
      amount: number;
      asset: string;
      toLabel: string;
      chain: string;
      /** Required for real WDK sends when env default is not set */
      toAddress?: string;
      feeEstimateUsd?: number;
      usdtAfterOnChain?: number;
      reserveNote?: string;
      /** Approval gate, preview, validation, policy, simulation — from agent-chat or client fallback */
      safety?: AgentSafetyEnvelope;
    }
  | {
      kind: "opportunity";
      summary: string;
      suggestedAction: string;
      fromChain: string;
      toChain: string;
      amount: number;
      asset?: "USDt" | "XAUt";
      /** Reserve = USDt liquidity; hedge = XAUt — not interchangeable */
      assetRoleLabel?: string;
      costEstimateUsd?: number;
      expectedNetBenefitUsd?: number;
      slippageBps?: number;
      confidence?: ConfidenceScore;
      whyNow?: string;
      whyNotNow?: string;
      principalRisks?: string[];
      liquidityImpact?: string;
      diversificationDelta?: "improves" | "worsens" | "neutral";
      /** Chain → weight 0–1 after the move (preview) */
      postTradeChainWeights?: Record<string, number>;
      /** Must match the benefit assumption used when the card was generated (for confirm-time checks) */
      policyBenefitUsd?: number;
    }
  | {
      kind: "recurring_wizard";
      asset: string;
      frequency: string;
      steps: string[];
    };

/** Normalized updates from agentClient / backend */
export type AgentPortfolioUpdate =
  | { type: "transfer"; fromChain: string; toChain: string; amount: number }
  | { type: "add_transaction"; tx: Transaction }
  | { type: "set_total"; value: number }
  | { type: "set_allocation"; allocation: Record<string, number> };

export interface WalletEntry {
  id: string;
  chain: string;
  address: string;
  label: string;
  /** Native gas token symbol from WDK balance fetch (e.g. ETH, SOL). */
  nativeSymbol?: string;
}

/** Lightweight session metrics: proves assist value beyond spectacle (turns, previews, safety). */
export interface SessionImpactV1 {
  userTurns: number;
  /** Assistant replies that included a structured card (transfer / opportunity / plan). */
  structuredPreviews: number;
  /** User completed a confirmed on-chain or local execution path. */
  confirmedActions: number;
  /** Policy / safety / validation stopped a risky path. */
  preventedMistakes: number;
}

export interface AgentSliceState {
  lastIntent: string | null;
  lastError: string | null;
  /** OpenClaw-style transcript: intent → plan → review → execute → reconcile */
  workflowLog: AgentWorkflowEntry[];
  /** Cost-aware decision log (recommendations / holds / executions) */
  decisionAudit?: DecisionAuditEntry[];
  /** Per-chat-session counters; reset when the user clears the workflow log. */
  sessionImpact: SessionImpactV1;
}
