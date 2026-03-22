import { create } from "zustand";
import { appendWorkflow } from "@/lib/agentWorkflow";
import type { AgentWorkflowPhase } from "@/lib/agentWorkflow";
import type { DecisionAuditEntry } from "@/lib/economics/types";
import type {
  AgentPortfolioUpdate,
  AgentSliceState,
  NestedAllocation,
  SessionImpactV1,
  Transaction,
  WalletEntry,
} from "@/types";

const DEFAULT_SESSION_IMPACT: SessionImpactV1 = {
  userTurns: 0,
  structuredPreviews: 0,
  confirmedActions: 0,
  preventedMistakes: 0,
};

interface PortfolioState {
  totalValue: number;
  allocation: Record<string, number>;
  allocationByAsset: NestedAllocation;
  transactions: Transaction[];
  chains: string[];
  wallets: WalletEntry[];
  error: string | null;
  /** Last error from WDK / live portfolio sync (distinct from validation `error`). */
  portfolioSyncError: string | null;
  agent: AgentSliceState;

  /** Full replace when hydrating from WDK or local portfolio snapshot */
  hydratePortfolio: (payload: {
    totalValue: number;
    allocation: Record<string, number>;
    allocationByAsset: NestedAllocation;
    transactions: Transaction[];
    wallets: WalletEntry[];
  }) => void;

  setTotalValue: (value: number) => void;
  setAllocation: (allocation: Record<string, number>) => void;
  setAllocationByAsset: (nested: NestedAllocation) => void;
  addTransaction: (tx: Transaction) => void;
  /** Insert or replace by matching `tx.hash` (used for Supabase realtime tx upserts). */
  upsertTransactionFromBackend: (tx: Transaction) => void;
  /** Merge server snapshot JSON into totals and allocation (ignores unknown keys). */
  mergeBackendSnapshot: (payload: unknown) => void;
  applyAgentUpdate: (update: AgentPortfolioUpdate) => void;
  /** @deprecated Prefer applyAgentUpdate — kept for agent.ts metadata */
  updateFromAgentCommand: (command: unknown) => void;
  setAgentIntent: (intent: string | null) => void;
  setAgentError: (message: string | null) => void;
  appendAgentWorkflow: (phase: AgentWorkflowPhase, detail: string) => void;
  clearAgentWorkflow: () => void;
  appendDecisionAudit: (entry: Omit<DecisionAuditEntry, "at"> & { at?: number }) => void;
  incrementSessionImpact: (key: "userTurns" | "structuredPreviews") => void;
  setPortfolioSyncError: (message: string | null) => void;
  clearError: () => void;
}

const sampleWallets: WalletEntry[] = [
  {
    id: "w1",
    chain: "ethereum",
    address: "0x71C…9A2",
    label: "Primary",
  },
  {
    id: "w2",
    chain: "arbitrum",
    address: "0x88B…01f",
    label: "Trading",
  },
];

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  totalValue: 12760,
  allocation: {
    ethereum: 5200,
    polygon: 3100,
    arbitrum: 2150,
    solana: 1200,
    tron: 500,
    ton: 610,
  },
  allocationByAsset: {
    ethereum: { USDt: 4800, XAUt: 400 },
    arbitrum: { USDt: 2000, XAUt: 150 },
    polygon: { USDt: 2800, XAUt: 300 },
    solana: { USDt: 900, XAUt: 300 },
    tron: { USDt: 500 },
    ton: { USDt: 610 },
  },
  transactions: [
    {
      hash: "0x3f2a91…",
      type: "send",
      amount: 50,
      asset: "USDt",
      fromChain: "ethereum",
      toChain: "ethereum",
      toAddress: "0x3f2a…",
      status: "confirmed",
      timestamp: Date.now() - 3600000,
    },
    {
      hash: "0x7b8c12…",
      type: "receive",
      amount: 120,
      asset: "USDt",
      fromChain: "polygon",
      toChain: "polygon",
      toAddress: "0xself",
      status: "confirmed",
      timestamp: Date.now() - 7200000,
    },
    {
      hash: "0xaa42ff…",
      type: "bridge",
      amount: 200,
      asset: "USDt",
      fromChain: "ethereum",
      toChain: "arbitrum",
      toAddress: "0xself",
      status: "confirmed",
      timestamp: Date.now() - 14400000,
    },
  ],
  chains: ["ethereum", "polygon", "arbitrum", "solana", "tron", "ton"],
  wallets: sampleWallets,
  error: null,
  portfolioSyncError: null,
  agent: {
    lastIntent: null,
    lastError: null,
    workflowLog: [],
    decisionAudit: [],
    sessionImpact: { ...DEFAULT_SESSION_IMPACT },
  },

  hydratePortfolio: (payload) => {
    set({
      totalValue: payload.totalValue,
      allocation: payload.allocation,
      allocationByAsset: payload.allocationByAsset,
      transactions: payload.transactions,
      wallets: payload.wallets,
      error: null,
      portfolioSyncError: null,
    });
  },

  setTotalValue: (value) => {
    if (typeof value !== "number" || isNaN(value) || value < 0) {
      console.error("[PortfolioStore] Invalid total value:", value);
      set({ error: "Invalid portfolio value" });
      return;
    }
    set({ totalValue: value, error: null });
  },

  setAllocation: (allocation) => {
    if (!allocation || typeof allocation !== "object") {
      console.error("[PortfolioStore] Invalid allocation:", allocation);
      set({ error: "Invalid allocation data" });
      return;
    }
    set({ allocation, error: null });
  },

  setAllocationByAsset: (nested) => {
    set({ allocationByAsset: nested, error: null });
  },

  addTransaction: (tx) => {
    if (!tx || !tx.hash || !tx.type) {
      console.error("[PortfolioStore] Invalid transaction:", tx);
      return;
    }
    set((state) => ({
      transactions: [tx, ...state.transactions].slice(0, 50),
      error: null,
    }));
  },

  upsertTransactionFromBackend: (tx) => {
    if (!tx || !tx.hash || !tx.type) return;
    set((state) => {
      const idx = state.transactions.findIndex((t) => t.hash === tx.hash);
      if (idx >= 0) {
        const next = [...state.transactions];
        next[idx] = tx;
        return { transactions: next, error: null };
      }
      return {
        transactions: [tx, ...state.transactions].slice(0, 50),
        error: null,
      };
    });
  },

  mergeBackendSnapshot: (payload) => {
    if (!payload || typeof payload !== "object") return;
    const p = payload as Record<string, unknown>;
    try {
      if (typeof p.totalValue === "number" && p.totalValue >= 0) {
        get().setTotalValue(p.totalValue);
      }
      if (p.allocation && typeof p.allocation === "object" && !Array.isArray(p.allocation)) {
        get().setAllocation(p.allocation as Record<string, number>);
      }
      if (p.allocationByAsset && typeof p.allocationByAsset === "object") {
        get().setAllocationByAsset(p.allocationByAsset as NestedAllocation);
      }
    } catch (e) {
      console.error("[PortfolioStore] mergeBackendSnapshot failed:", e);
    }
  },

  applyAgentUpdate: (update) => {
    try {
      if (update.type === "transfer") {
        const { fromChain, toChain, amount } = update;
        if (!fromChain || !toChain || typeof amount !== "number" || amount <= 0) {
          console.error("[PortfolioStore] Invalid transfer:", update);
          set({ error: "Invalid transfer parameters" });
          return;
        }
        const newAllocation = { ...get().allocation };
        newAllocation[fromChain] = (newAllocation[fromChain] || 0) - amount;
        newAllocation[toChain] = (newAllocation[toChain] || 0) + amount;
        const nested = { ...get().allocationByAsset };
        const fromRow = { ...(nested[fromChain] ?? {}) };
        const toRow = { ...(nested[toChain] ?? {}) };
        const moveUsdT = Math.min(amount, fromRow.USDt ?? 0);
        if (moveUsdT > 0) {
          fromRow.USDt = (fromRow.USDt ?? 0) - moveUsdT;
          toRow.USDt = (toRow.USDt ?? 0) + moveUsdT;
        }
        nested[fromChain] = fromRow;
        nested[toChain] = toRow;
        set({ allocation: newAllocation, allocationByAsset: nested, error: null });
        return;
      }
      if (update.type === "add_transaction") {
        get().addTransaction(update.tx);
        return;
      }
      if (update.type === "set_total") {
        get().setTotalValue(update.value);
        return;
      }
      if (update.type === "set_allocation") {
        get().setAllocation(update.allocation);
      }
    } catch (error) {
      console.error("[PortfolioStore] applyAgentUpdate failed:", error);
      set({ error: "Failed to update portfolio" });
    }
  },

  updateFromAgentCommand: (command) => {
    if (!command || typeof command !== "object") {
      console.warn("[PortfolioStore] Empty agent command");
      return;
    }
    const c = command as { type?: string };
    if (c.type === "transfer") {
      get().applyAgentUpdate(c as AgentPortfolioUpdate);
    }
  },

  setAgentIntent: (intent) => set((s) => ({ agent: { ...s.agent, lastIntent: intent } })),
  setAgentError: (message) =>
    set((s) => ({ agent: { ...s.agent, lastError: message } })),

  appendDecisionAudit: (entry) =>
    set((s) => {
      const row: DecisionAuditEntry = { ...entry, at: entry.at ?? Date.now() };
      const si: SessionImpactV1 = { ...DEFAULT_SESSION_IMPACT, ...s.agent.sessionImpact };
      if (row.kind === "rejection") si.preventedMistakes += 1;
      if (row.kind === "execution") si.confirmedActions += 1;
      return {
        agent: {
          ...s.agent,
          decisionAudit: [...(s.agent.decisionAudit ?? []), row].slice(-40),
          sessionImpact: si,
        },
      };
    }),

  incrementSessionImpact: (key) =>
    set((s) => {
      const si: SessionImpactV1 = { ...DEFAULT_SESSION_IMPACT, ...s.agent.sessionImpact };
      si[key] += 1;
      return { agent: { ...s.agent, sessionImpact: si } };
    }),

  appendAgentWorkflow: (phase, detail) =>
    set((s) => ({
      agent: {
        ...s.agent,
        workflowLog: appendWorkflow(s.agent.workflowLog, phase, detail).slice(-50),
      },
    })),

  clearAgentWorkflow: () =>
    set((s) => ({
      agent: {
        ...s.agent,
        workflowLog: [],
        decisionAudit: [],
        sessionImpact: { ...DEFAULT_SESSION_IMPACT },
      },
    })),

  setPortfolioSyncError: (message) => set({ portfolioSyncError: message }),

  clearError: () => set({ error: null }),
}));
