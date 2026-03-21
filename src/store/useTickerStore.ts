import { create } from "zustand";
import type { TickerTransaction, Transaction } from "@/types";
import { formatCompactAge, mapPortfolioTransaction, mockTickerTransaction } from "@/lib/tickerUtils";

interface TickerState {
  demoTransactions: TickerTransaction[];
  addDemoTransaction: () => void;
  clearDemo: () => void;
}

export function mergeTickerFeed(
  portfolioTransactions: Transaction[],
  demoTransactions: TickerTransaction[],
  now: number
): TickerTransaction[] {
  const mapped = portfolioTransactions.map((tx) => mapPortfolioTransaction(tx, now));
  const withAge = (t: TickerTransaction) => ({
    ...t,
    age: formatCompactAge(t.timestamp, now),
  });

  const seen = new Set<string>();
  const out: TickerTransaction[] = [];
  for (const t of [...demoTransactions.map(withAge), ...mapped.map(withAge)]) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);
}

export const useTickerStore = create<TickerState>((set) => ({
  demoTransactions: [],

  addDemoTransaction: () => {
    const tx = mockTickerTransaction();
    set((state) => ({
      demoTransactions: [tx, ...state.demoTransactions].slice(0, 25),
    }));

    const id = tx.id;
    window.setTimeout(() => {
      set((s) => ({
        demoTransactions: s.demoTransactions.map((t) =>
          t.id === id && t.status === "pending" ? { ...t, status: "confirmed" as const } : t
        ),
      }));
    }, 3000);
  },

  clearDemo: () => set({ demoTransactions: [] }),
}));
