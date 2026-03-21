import { create } from "zustand";
import {
  DEMO_SESSION_KEY,
  WALLET_MODE_KEY,
} from "@/lib/demoWallet";
import { getDemoPortfolioSnapshot, randomMockTransaction } from "@/lib/mockData";
import {
  connectDemoWallet as connectWdkSession,
  disconnectWalletSession,
  refreshLivePortfolio,
} from "@/lib/walletClient";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import type { NestedAllocation } from "@/types";

interface DemoState {
  isDemoWalletConnected: boolean;
  /** UI badge: real WDK vs mock balances */
  walletMode: "demo" | "wdk";
  connectDemoWallet: () => Promise<void>;
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

function readWalletMode(): "demo" | "wdk" {
  try {
    return sessionStorage.getItem(WALLET_MODE_KEY) === "wdk" ? "wdk" : "demo";
  } catch {
    return "demo";
  }
}

export const useDemoStore = create<DemoState>((set, get) => ({
  isDemoWalletConnected: readDemo(),
  walletMode: readWalletMode(),

  connectDemoWallet: async () => {
    if (import.meta.env.VITE_USE_WDK === "false") {
      localStorage.setItem(DEMO_SESSION_KEY, "1");
      try {
        sessionStorage.setItem(WALLET_MODE_KEY, "demo");
      } catch {
        /* ignore */
      }
      set({ isDemoWalletConnected: true, walletMode: "demo" });
      usePortfolioStore.getState().hydrateDemoPortfolio(getDemoPortfolioSnapshot());
      return;
    }

    const result = await connectWdkSession();
    if (result.success) {
      localStorage.setItem(DEMO_SESSION_KEY, "1");
      set({ isDemoWalletConnected: true, walletMode: "wdk" });
      try {
        await refreshLivePortfolio();
      } catch {
        try {
          sessionStorage.setItem(WALLET_MODE_KEY, "demo");
        } catch {
          /* ignore */
        }
        set({ walletMode: "demo" });
        usePortfolioStore.getState().hydrateDemoPortfolio(getDemoPortfolioSnapshot());
      }
      return;
    }

    localStorage.setItem(DEMO_SESSION_KEY, "1");
    try {
      sessionStorage.setItem(WALLET_MODE_KEY, "demo");
    } catch {
      /* ignore */
    }
    set({ isDemoWalletConnected: true, walletMode: "demo" });
    usePortfolioStore.getState().hydrateDemoPortfolio(getDemoPortfolioSnapshot());
  },

  disconnectDemoWallet: () => {
    disconnectWalletSession();
    localStorage.removeItem(DEMO_SESSION_KEY);
    try {
      sessionStorage.setItem(WALLET_MODE_KEY, "demo");
    } catch {
      /* ignore */
    }
    set({ isDemoWalletConnected: false, walletMode: "demo" });
  },

  refreshPortfolio: () => {
    if (!get().isDemoWalletConnected) return;
    if (get().walletMode === "wdk") {
      void refreshLivePortfolio().catch(() => {
        /* error already recorded on store */
      });
      return;
    }
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
