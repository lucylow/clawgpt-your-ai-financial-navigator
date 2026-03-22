import { useEffect, useMemo } from "react";
import { useTickerFeed } from "@/hooks/useTickerFeed";
import { useTickerStore } from "@/store/useTickerStore";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import type { TickerTransaction } from "@/types";
import { InfiniteScroll } from "./InfiniteScroll";
import { MobileTicker } from "./MobileTicker";
import { TransactionItem } from "./TransactionItem";

function LiveRegion({ transactions }: { transactions: TickerTransaction[] }) {
  const latest = transactions[0];
  const announcement = latest
    ? `${latest.type} ${latest.amount} ${latest.asset} on ${latest.chain}`
    : null;

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}

export function TransactionTicker() {
  const transactions = useTickerFeed();
  const totalValue = usePortfolioStore((s) => s.totalValue);
  const addPulseTransaction = useTickerStore((s) => s.addPulseTransaction);

  /** Larger portfolios → slightly faster marquee (more “activity”). */
  const marqueeDurationSec = useMemo(() => {
    const t = Number.isFinite(totalValue) ? totalValue : 0;
    if (t > 50_000) return 32;
    if (t > 15_000) return 40;
    return 48;
  }, [totalValue]);

  useEffect(() => {
    const id = window.setInterval(() => {
      addPulseTransaction();
    }, 10_000);
    return () => window.clearInterval(id);
  }, [addPulseTransaction]);

  const empty = (
    <div className="flex h-20 items-center px-4 text-sm text-muted-foreground">
      No transactions yet — ask Claw to preview a send or bridge.
    </div>
  );

  return (
    <section
      className="overflow-hidden border-t border-slate-800/50 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-slate-950/40 backdrop-blur-xl"
      role="log"
      aria-label="Recent transactions"
      tabIndex={0}
    >
      <LiveRegion transactions={transactions} />

      <div className="sm:hidden">
        {transactions.length ? <MobileTicker transactions={transactions} /> : empty}
      </div>

      <div className="hidden h-20 sm:block">
        {transactions.length ? (
          <InfiniteScroll durationSec={marqueeDurationSec} className="flex items-center">
            {transactions.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
            {transactions.map((tx) => (
              <TransactionItem key={`marquee-${tx.id}`} tx={tx} />
            ))}
          </InfiniteScroll>
        ) : (
          empty
        )}
      </div>
    </section>
  );
}
