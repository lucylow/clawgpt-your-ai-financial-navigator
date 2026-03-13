import { create } from "zustand";
import type { Transaction } from "@/types";

interface PortfolioState {
  totalValue: number;
  allocation: Record<string, number>;
  transactions: Transaction[];
  chains: string[];

  setTotalValue: (value: number) => void;
  setAllocation: (allocation: Record<string, number>) => void;
  addTransaction: (tx: Transaction) => void;
  updateFromAgentCommand: (command: any) => void;
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

  setTotalValue: (value) => set({ totalValue: value }),
  setAllocation: (allocation) => set({ allocation }),
  addTransaction: (tx) =>
    set((state) => ({
      transactions: [tx, ...state.transactions].slice(0, 50),
    })),
  updateFromAgentCommand: (command) => {
    if (command.type === "transfer") {
      const { fromChain, toChain, amount } = command;
      const newAllocation = { ...get().allocation };
      newAllocation[fromChain] = (newAllocation[fromChain] || 0) - amount;
      newAllocation[toChain] = (newAllocation[toChain] || 0) + amount;
      set({ allocation: newAllocation });
    }
  },
}));
