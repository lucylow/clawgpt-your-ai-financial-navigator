import { motion } from "framer-motion";
import type { TickerTransaction } from "@/types";
import { TransactionItem } from "./TransactionItem";

interface MobileTickerProps {
  transactions: TickerTransaction[];
}

export function MobileTicker({ transactions }: MobileTickerProps) {
  const loop = transactions.length >= 2 ? [...transactions, ...transactions] : transactions;

  if (!transactions.length) {
    return (
      <div className="flex h-24 items-center justify-center px-4 text-center text-xs text-muted-foreground">
        No transactions yet — ask Claw to simulate a send or bridge.
      </div>
    );
  }

  return (
    <div className="relative h-24 overflow-hidden bg-gradient-to-b from-slate-950/90 to-transparent">
      <motion.div
        className="flex flex-col gap-2 px-3 pt-2"
        animate={{ y: ["0%", "-50%"] }}
        transition={{
          duration: Math.max(14, transactions.length * 3.5),
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {loop.map((tx, i) => (
          <TransactionItem key={`${tx.id}-${i}`} tx={tx} compact showTime={false} />
        ))}
      </motion.div>
    </div>
  );
}
