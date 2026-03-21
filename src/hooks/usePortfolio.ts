import { useCallback } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";

/**
 * Single hook for cockpit data: portfolio store + refresh placeholder.
 */
export function usePortfolio() {
  const store = usePortfolioStore();

  const refreshBalances = useCallback(async () => {
    // TODO: GET /api/portfolio or walletClient.getBalances
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
    agent: store.agent,
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
