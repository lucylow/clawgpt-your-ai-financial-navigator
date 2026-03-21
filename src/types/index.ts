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

/** Display model for the live transaction ticker (UI + demo feed) */
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
    }
  | {
      kind: "opportunity";
      summary: string;
      suggestedAction: string;
      fromChain: string;
      toChain: string;
      amount: number;
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
}

export interface AgentSliceState {
  lastIntent: string | null;
  lastError: string | null;
}
