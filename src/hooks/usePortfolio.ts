import { useCallback } from "react";
import { getWalletMode, refreshLivePortfolio } from "@/lib/walletClient";
import { usePortfolioStore } from "@/store/usePortfolioStore";

/**
 * Single hook for cockpit data: portfolio store + refresh placeholder.
 */
export function usePortfolio() {
  const store = usePortfolioStore();

  const refreshBalances = useCallback(async () => {
    if (getWalletMode() === "wdk") {
      try {
        await refreshLivePortfolio();
      } catch (e) {
        console.error("[usePortfolio] refreshLivePortfolio:", e);
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }, []);

  return {
    totalValue: store.totalValue,
    allocation: store.allocation,
    allocationByAsset: store.allocationByAsset,
    transactions: store.transactions,
    chains: store.chains,
    wallets: store.wallets,
    error: store.error,
    portfolioSyncError: store.portfolioSyncError,
    clearPortfolioSyncError: () => store.setPortfolioSyncError(null),
    agent: store.agent,
    appendDecisionAudit: store.appendDecisionAudit,
    setTotalValue: store.setTotalValue,
    setAllocation: store.setAllocation,
    addTransaction: store.addTransaction,
    applyAgentUpdate: store.applyAgentUpdate,
    applyOptimisticTransfer: (fromChain: string, toChain: string, amount: number) => {
      store.applyAgentUpdate({ type: "transfer", fromChain, toChain, amount });
    },
    refreshBalances,
  };
}
