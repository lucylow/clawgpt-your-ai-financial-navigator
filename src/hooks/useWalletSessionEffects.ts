import { useEffect, useRef } from "react";
import { useWalletSessionStore } from "@/store/useWalletSessionStore";

/** Periodic portfolio refresh + ticker activity when a session is active. */
export function useWalletSessionEffects() {
  const connected = useWalletSessionStore((s) => s.isWalletConnected);
  const walletMode = useWalletSessionStore((s) => s.walletMode);
  const refreshPortfolio = useWalletSessionStore((s) => s.refreshPortfolio);
  const tickRandomTransaction = useWalletSessionStore((s) => s.tickRandomTransaction);
  const refreshRef = useRef(refreshPortfolio);
  refreshRef.current = refreshPortfolio;

  useEffect(() => {
    if (!connected) return;
    const intervalMs = walletMode === "local" ? 30_000 : 45_000;
    const id = window.setInterval(() => {
      refreshRef.current();
      if (walletMode === "local") tickRandomTransaction();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [connected, walletMode, tickRandomTransaction]);
}
