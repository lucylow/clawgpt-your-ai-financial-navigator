import { useEffect } from "react";
import { useDemoStore } from "@/store/useDemoStore";

/**
 * Auto-demo: portfolio drift every 15s, new synthetic tx every 30s (mock, frontend-only).
 */
export function useDemoModeEffects() {
  const connected = useDemoStore((s) => s.isDemoWalletConnected);
  const walletMode = useDemoStore((s) => s.walletMode);
  const refreshPortfolio = useDemoStore((s) => s.refreshPortfolio);
  const tickRandomTransaction = useDemoStore((s) => s.tickRandomTransaction);

  useEffect(() => {
    if (!connected) return;
    const id15 = window.setInterval(() => refreshPortfolio(), 15_000);
    const id30 =
      walletMode === "demo"
        ? window.setInterval(() => tickRandomTransaction(), 30_000)
        : undefined;
    return () => {
      window.clearInterval(id15);
      if (id30 !== undefined) window.clearInterval(id30);
    };
  }, [connected, walletMode, refreshPortfolio, tickRandomTransaction]);
}
