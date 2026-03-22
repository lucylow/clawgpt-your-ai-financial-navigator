import { create } from "zustand";
import {
  clearWalletSessionFlags,
  isWalletSessionActive,
  persistWalletSessionFlags,
  WALLET_MODE_KEY,
} from "@/lib/demoWallet";
import { getLocalPortfolioSnapshot, savePersistedWalletPortfolio } from "@/lib/dataSimulator";
import { randomSampleTransaction } from "@/lib/mockData";
import { captureError } from "@/lib/observability";
import { classifyWalletError } from "@/lib/web3Errors";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import type { NestedAllocation } from "@/types";

export type WalletSessionMode = "wdk" | "local";

interface WalletSessionState {
  isWalletConnected: boolean;
  /** WDK + RPC vs local portfolio snapshot */
  walletMode: WalletSessionMode;
  /** Non-null while connect is in progress (landing / wallet button). */
  walletConnectPhase: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  /** Drop WDK session errors and use rich local portfolio (cockpit stays connected). */
  resumeLocalPortfolio: () => void;
  refreshPortfolio: () => void;
  tickRandomTransaction: () => void;
}

function readConnected(): boolean {
  return isWalletSessionActive();
}

function readWalletMode(): WalletSessionMode {
  try {
    return sessionStorage.getItem(WALLET_MODE_KEY) === "wdk" ? "wdk" : "local";
  } catch {
    return "local";
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

export const useWalletSessionStore = create<WalletSessionState>((set, get) => ({
  isWalletConnected: readConnected(),
  walletMode: readWalletMode(),
  walletConnectPhase: null,

  connectWallet: async () => {
    set({ walletConnectPhase: "Preparing…" });
    if (import.meta.env.VITE_USE_WDK === "false") {
      if (!persistWalletSessionFlags()) {
        usePortfolioStore
          .getState()
          .setPortfolioSyncError(
            "Could not save session (storage blocked or full). Portfolio data is in-memory only.",
          );
      }
      safeSessionSet(WALLET_MODE_KEY, "local");
      const snap = getLocalPortfolioSnapshot();
      savePersistedWalletPortfolio(snap);
      set({ isWalletConnected: true, walletMode: "local", walletConnectPhase: null });
      usePortfolioStore.getState().hydratePortfolio(snap);
      return;
    }

    let connectWdkSession: typeof import("@/lib/walletClient").connectWallet;
    let refreshLivePortfolio: typeof import("@/lib/walletClient").refreshLivePortfolio;
    try {
      set({ walletConnectPhase: "Loading wallet SDK…" });
      const mod = await import("@/lib/walletClient");
      connectWdkSession = mod.connectWallet;
      refreshLivePortfolio = mod.refreshLivePortfolio;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const persisted = persistWalletSessionFlags();
      usePortfolioStore.getState().setPortfolioSyncError(
        !persisted
          ? `Wallet module failed to load: ${msg} Session storage unavailable.`
          : `Wallet module failed to load: ${msg}`,
      );
      safeSessionSet(WALLET_MODE_KEY, "local");
      const snap = getLocalPortfolioSnapshot();
      savePersistedWalletPortfolio(snap);
      set({ isWalletConnected: true, walletMode: "local", walletConnectPhase: null });
      usePortfolioStore.getState().hydratePortfolio(snap);
      return;
    }

    set({ walletConnectPhase: "Connecting multi-chain session…" });
    const result = await connectWdkSession();
    if (result.success) {
      if (!persistWalletSessionFlags()) {
        usePortfolioStore
          .getState()
          .setPortfolioSyncError("Connected, but session could not be persisted (storage blocked or full).");
      }
      set({ isWalletConnected: true, walletMode: "wdk" });
      try {
        set({ walletConnectPhase: "Syncing live balances…" });
        await refreshLivePortfolio();
        set({ walletConnectPhase: null });
      } catch (e) {
        captureError(e, { context: { source: "useWalletSessionStore.connectWallet", phase: "initial_portfolio_sync" } });
        safeSessionSet(WALLET_MODE_KEY, "local");
        set({ walletMode: "local", walletConnectPhase: null });
        const snap = getLocalPortfolioSnapshot();
        savePersistedWalletPortfolio(snap);
        usePortfolioStore.getState().hydratePortfolio(snap);
      }
      return;
    }

    const errDetail = result.error?.trim();
    const classified = errDetail ? classifyWalletError(errDetail) : null;
    const errSummary = classified ? `${classified.message} — ${classified.hint}` : errDetail || "Wallet unavailable.";
    const persisted = persistWalletSessionFlags();
    usePortfolioStore.getState().setPortfolioSyncError(
      !persisted
        ? `Wallet: ${errSummary} Using local portfolio; session not saved (storage blocked).`
        : `Wallet: ${errSummary} Using local portfolio.`,
    );
    safeSessionSet(WALLET_MODE_KEY, "local");
    const snap = getLocalPortfolioSnapshot();
    savePersistedWalletPortfolio(snap);
    set({ isWalletConnected: true, walletMode: "local", walletConnectPhase: null });
    usePortfolioStore.getState().hydratePortfolio(snap);
  },

  disconnectWallet: () => {
    void import("@/lib/walletClient").then(({ disconnectWalletSession }) => disconnectWalletSession());
    clearWalletSessionFlags();
    safeSessionSet(WALLET_MODE_KEY, "local");
    set({ isWalletConnected: false, walletMode: "local", walletConnectPhase: null });
  },

  resumeLocalPortfolio: () => {
    void import("@/lib/walletClient").then(({ disconnectWalletSession }) => disconnectWalletSession());
    safeSessionSet(WALLET_MODE_KEY, "local");
    persistWalletSessionFlags();
    const snap = getLocalPortfolioSnapshot();
    savePersistedWalletPortfolio(snap);
    set({ isWalletConnected: true, walletMode: "local", walletConnectPhase: null });
    usePortfolioStore.getState().hydratePortfolio(snap);
    usePortfolioStore.getState().setPortfolioSyncError(null);
  },

  refreshPortfolio: () => {
    if (!get().isWalletConnected) return;
    if (get().walletMode === "wdk") {
      void import("@/lib/walletClient").then(({ refreshLivePortfolio }) =>
        refreshLivePortfolio().catch((err) => {
          captureError(err, { context: { source: "useWalletSessionStore.refreshPortfolio" } });
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
    savePersistedWalletPortfolio({
      totalValue: newTotal,
      allocation: newAllocation,
      allocationByAsset: newNested,
      transactions: p.transactions,
      wallets: p.wallets,
    });
  },

  tickRandomTransaction: () => {
    if (!get().isWalletConnected) return;
    usePortfolioStore.getState().addTransaction(randomSampleTransaction());
  },
}));
