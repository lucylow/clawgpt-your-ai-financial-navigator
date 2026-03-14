import { create } from "zustand";
import type { Transaction } from "@/types";

interface PortfolioState {
  totalValue: number;
  allocation: Record<string, number>;
  transactions: Transaction[];
  chains: string[];
  error: string | null;

  setTotalValue: (value: number) => void;
  setAllocation: (allocation: Record<string, number>) => void;
  addTransaction: (tx: Transaction) => void;
  updateFromAgentCommand: (command: any) => void;
  clearError: () => void;
}

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
  transactions: [
    {
      hash: "0x3f2a91...",
      type: "send",
      amount: 50,
      asset: "USDt",
      fromChain: "ethereum",
      toChain: "ethereum",
      toAddress: "0x3f2a...",
      status: "confirmed",
      timestamp: Date.now() - 3600000,
    },
    {
      hash: "0x7b8c12...",
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
      hash: "0xaa42ff...",
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
  error: null,

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

  updateFromAgentCommand: (command) => {
    try {
      if (!command || !command.type) {
        console.warn("[PortfolioStore] Received empty agent command");
        return;
      }
      if (command.type === "transfer") {
        const { fromChain, toChain, amount } = command;
        if (!fromChain || !toChain || typeof amount !== "number" || amount <= 0) {
          console.error("[PortfolioStore] Invalid transfer command:", command);
          set({ error: "Invalid transfer parameters" });
          return;
        }
        const newAllocation = { ...get().allocation };
        newAllocation[fromChain] = (newAllocation[fromChain] || 0) - amount;
        newAllocation[toChain] = (newAllocation[toChain] || 0) + amount;
        set({ allocation: newAllocation, error: null });
      }
    } catch (error) {
      console.error("[PortfolioStore] Failed to process agent command:", error);
      set({ error: "Failed to update portfolio" });
    }
  },

  clearError: () => set({ error: null }),
}));
