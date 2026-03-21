import { create } from "zustand";
import {
  DEMO_SESSION_KEY,
  WALLET_MODE_KEY,
} from "@/lib/demoWallet";
import { getDemoPortfolioSnapshot, randomMockTransaction } from "@/lib/mockData";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import type { NestedAllocation } from "@/types";

interface DemoState {
  isDemoWalletConnected: boolean;
  /** UI badge: real WDK vs mock balances */
  walletMode: "demo" | "wdk";
  connectDemoWallet: () => Promise<void>;
  disconnectDemoWallet: () => void;
  /** Drop WDK session errors and use rich mock portfolio (cockpit stays “connected”). */
  enterDemoMode: () => void;
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

function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

function safeLocalSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeLocalRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const useDemoStore = create<DemoState>((set, get) => ({
  isDemoWalletConnected: readDemo(),
  walletMode: readWalletMode(),

  connectDemoWallet: async () => {
    if (import.meta.env.VITE_USE_WDK === "false") {
      if (!safeLocalSet(DEMO_SESSION_KEY, "1")) {
        usePortfolioStore
          .getState()
          .setPortfolioSyncError("Could not save session (storage blocked or full). Demo data is in-memory only.");
      }
      safeSessionSet(WALLET_MODE_KEY, "demo");
      set({ isDemoWalletConnected: true, walletMode: "demo" });
      usePortfolioStore.getState().hydrateDemoPortfolio(getDemoPortfolioSnapshot());
      return;
    }

    let connectWdkSession: typeof import("@/lib/walletClient").connectDemoWallet;
    let refreshLivePortfolio: typeof import("@/lib/walletClient").refreshLivePortfolio;
    try {
      const mod = await import("@/lib/walletClient");
      connectWdkSession = mod.connectDemoWallet;
      refreshLivePortfolio = mod.refreshLivePortfolio;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const persisted = safeLocalSet(DEMO_SESSION_KEY, "1");
      usePortfolioStore.getState().setPortfolioSyncError(
        !persisted
          ? `Wallet module failed to load: ${msg} Session storage unavailable.`
          : `Wallet module failed to load: ${msg}`,
      );
      safeSessionSet(WALLET_MODE_KEY, "demo");
      set({ isDemoWalletConnected: true, walletMode: "demo" });
      usePortfolioStore.getState().hydrateDemoPortfolio(getDemoPortfolioSnapshot());
      return;
    }

    const result = await connectWdkSession();
    if (result.success) {
      if (!safeLocalSet(DEMO_SESSION_KEY, "1")) {
        usePortfolioStore
          .getState()
          .setPortfolioSyncError("Connected, but session could not be persisted (storage blocked or full).");
      }
      set({ isDemoWalletConnected: true, walletMode: "wdk" });
      try {
        await refreshLivePortfolio();
      } catch {
        safeSessionSet(WALLET_MODE_KEY, "demo");
        set({ walletMode: "demo" });
        usePortfolioStore.getState().hydrateDemoPortfolio(getDemoPortfolioSnapshot());
      }
      return;
    }

    const errDetail = result.error?.trim();
    const persisted = safeLocalSet(DEMO_SESSION_KEY, "1");
    usePortfolioStore.getState().setPortfolioSyncError(
      !persisted
        ? errDetail
          ? `Live wallet: ${errDetail}. Demo portfolio active; session not saved (storage blocked).`
          : "Live wallet unavailable. Demo portfolio active; session not saved (storage blocked)."
        : errDetail
          ? `Live wallet: ${errDetail}. Using demo portfolio.`
          : "Live wallet unavailable. Using demo portfolio.",
    );
    safeSessionSet(WALLET_MODE_KEY, "demo");
    set({ isDemoWalletConnected: true, walletMode: "demo" });
    usePortfolioStore.getState().hydrateDemoPortfolio(getDemoPortfolioSnapshot());
  },

  disconnectDemoWallet: () => {
    void import("@/lib/walletClient").then(({ disconnectWalletSession }) => disconnectWalletSession());
    safeLocalRemove(DEMO_SESSION_KEY);
    safeSessionSet(WALLET_MODE_KEY, "demo");
    set({ isDemoWalletConnected: false, walletMode: "demo" });
  },

  enterDemoMode: () => {
    void import("@/lib/walletClient").then(({ disconnectWalletSession }) => disconnectWalletSession());
    safeSessionSet(WALLET_MODE_KEY, "demo");
    safeLocalSet(DEMO_SESSION_KEY, "1");
    set({ isDemoWalletConnected: true, walletMode: "demo" });
    usePortfolioStore.getState().hydrateDemoPortfolio(getDemoPortfolioSnapshot());
    usePortfolioStore.getState().setPortfolioSyncError(null);
  },

  refreshPortfolio: () => {
    if (!get().isDemoWalletConnected) return;
    if (get().walletMode === "wdk") {
      void import("@/lib/walletClient").then(({ refreshLivePortfolio }) =>
        refreshLivePortfolio().catch(() => {
          /* error already recorded on store */
        }),
      );
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
