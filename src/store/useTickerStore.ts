import { create } from "zustand";
import type { TickerTransaction, Transaction } from "@/types";
import { formatCompactAge, mapPortfolioTransaction, sampleTickerTransaction } from "@/lib/tickerUtils";

interface TickerState {
  pulseTransactions: TickerTransaction[];
  addPulseTransaction: () => void;
  clearPulse: () => void;
}

export function mergeTickerFeed(
  portfolioTransactions: Transaction[],
  pulseTransactions: TickerTransaction[],
  now: number,
): TickerTransaction[] {
  const mapped = portfolioTransactions.map((tx) => mapPortfolioTransaction(tx, now));
  const withAge = (t: TickerTransaction) => ({
    ...t,
    age: formatCompactAge(t.timestamp, now),
  });

  const seen = new Set<string>();
  const out: TickerTransaction[] = [];
  for (const t of [...pulseTransactions.map(withAge), ...mapped.map(withAge)]) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);
}

export const useTickerStore = create<TickerState>((set) => ({
  pulseTransactions: [],

  addPulseTransaction: () => {
    const tx = sampleTickerTransaction();
    set((state) => ({
      pulseTransactions: [tx, ...state.pulseTransactions].slice(0, 25),
    }));

    const id = tx.id;
    window.setTimeout(() => {
      set((s) => ({
        pulseTransactions: s.pulseTransactions.map((t) =>
          t.id === id && t.status === "pending" ? { ...t, status: "confirmed" as const } : t,
        ),
      }));
    }, 3000);
  },

  clearPulse: () => set({ pulseTransactions: [] }),
}));
