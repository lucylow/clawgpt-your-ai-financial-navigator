import { create } from "zustand";
import type {
  AgentPortfolioUpdate,
  AgentSliceState,
  NestedAllocation,
  Transaction,
  WalletEntry,
} from "@/types";

interface PortfolioState {
  totalValue: number;
  allocation: Record<string, number>;
  allocationByAsset: NestedAllocation;
  transactions: Transaction[];
  chains: string[];
  wallets: WalletEntry[];
  error: string | null;
  agent: AgentSliceState;

  /** Full replace for frontend demo / mock hydration */
  hydrateDemoPortfolio: (payload: {
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
  applyAgentUpdate: (update: AgentPortfolioUpdate) => void;
  /** @deprecated Prefer applyAgentUpdate — kept for agent.ts metadata */
  updateFromAgentCommand: (command: unknown) => void;
  setAgentIntent: (intent: string | null) => void;
  setAgentError: (message: string | null) => void;
  clearError: () => void;
}

const demoWallets: WalletEntry[] = [
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
  wallets: demoWallets,
  error: null,
  agent: { lastIntent: null, lastError: null },

  hydrateDemoPortfolio: (payload) => {
    set({
      totalValue: payload.totalValue,
      allocation: payload.allocation,
      allocationByAsset: payload.allocationByAsset,
      transactions: payload.transactions,
      wallets: payload.wallets,
      error: null,
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
        set({ allocation: newAllocation, error: null });
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

  clearError: () => set({ error: null }),
}));
