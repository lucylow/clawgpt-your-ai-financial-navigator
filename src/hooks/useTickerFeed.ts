import { useEffect, useMemo, useState } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { mergeTickerFeed, useTickerStore } from "@/store/useTickerStore";

export function useTickerFeed() {
  const portfolioTxs = usePortfolioStore((s) => s.transactions);
  const demoTxs = useTickerStore((s) => s.demoTransactions);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => mergeTickerFeed(portfolioTxs, demoTxs, now), [portfolioTxs, demoTxs, now]);
}
