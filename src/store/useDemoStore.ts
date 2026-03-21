import { create } from "zustand";
import { DEMO_SESSION_KEY } from "@/lib/demoWallet";
import { getDemoPortfolioSnapshot, randomMockTransaction } from "@/lib/mockData";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import type { NestedAllocation } from "@/types";

interface DemoState {
  isDemoWalletConnected: boolean;
  connectDemoWallet: () => void;
  disconnectDemoWallet: () => void;
  refreshPortfolio: () => void;
  tickRandomTransaction: () => void;
}

function readDemo(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export const useDemoStore = create<DemoState>((set, get) => ({
  isDemoWalletConnected: readDemo(),

  connectDemoWallet: () => {
    localStorage.setItem(DEMO_SESSION_KEY, "1");
    set({ isDemoWalletConnected: true });
    usePortfolioStore.getState().hydrateDemoPortfolio(getDemoPortfolioSnapshot());
  },

  disconnectDemoWallet: () => {
    localStorage.removeItem(DEMO_SESSION_KEY);
    set({ isDemoWalletConnected: false });
  },

  refreshPortfolio: () => {
    if (!get().isDemoWalletConnected) return;
    const p = usePortfolioStore.getState();
    const factor = 0.98 + Math.random() * 0.04;
    const tv = p.totalValue || 1;
    const newTotal = Math.round(tv * factor * 100) / 100;
    const scale = newTotal / tv;
    const newAllocation: Record<string, number> = {};
    for (const [k, v] of Object.entries(p.allocation)) {
      newAllocation[k] = Math.round(v * scale * 100) / 100;
    }
    const nested = p.allocationByAsset;
    const newNested: NestedAllocation = {};
    for (const [chain, assets] of Object.entries(nested)) {
      newNested[chain] = {};
      for (const [a, v] of Object.entries(assets)) {
        newNested[chain][a] = Math.round(v * scale * 100) / 100;
      }
    }
    p.setTotalValue(newTotal);
    p.setAllocation(newAllocation);
    p.setAllocationByAsset(newNested);
  },

  tickRandomTransaction: () => {
    if (!get().isDemoWalletConnected) return;
    usePortfolioStore.getState().addTransaction(randomMockTransaction());
  },
}));
