import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpFromLine,
  Landmark,
  Send,
  Shuffle,
} from "lucide-react";
import type { TickerTransaction } from "@/types";
import { cn } from "@/lib/utils";

const txIcons = {
  sent: Send,
  received: ArrowDownLeft,
  deposit: Landmark,
  withdraw: ArrowUpFromLine,
  bridge: ArrowLeftRight,
  swap: Shuffle,
} as const;

function chainShort(chain: string): string {
  return chain.slice(0, 3).toUpperCase();
}

function formatAddress(addr: string | undefined, compact: boolean): string {
  if (!addr) return "";
  if (addr.toLowerCase() === "0xself") return compact ? "self" : "your wallet";
  if (addr.length < 12) return addr;
  if (compact) return `${addr.slice(0, 6)}…`;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function summaryLine(tx: TickerTransaction, compact: boolean): string {
  const amt = tx.amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const addr = formatAddress(tx.to, compact);

  switch (tx.type) {
    case "sent":
      return `SENT ${amt} ${tx.asset} → ${addr}`;
    case "received":
      return `RECV ${amt} ${tx.asset} ← ${addr}`;
    case "deposit":
      return `AAVE Deposit ${amt} ${tx.asset}`;
    case "withdraw":
      return `Withdraw ${amt} ${tx.asset}`;
    case "bridge": {
      const to = tx.chainTo ? `${chainShort(tx.chain)}→${chainShort(tx.chainTo)}` : chainShort(tx.chain);
      return `Bridge ${amt} ${tx.asset} ${to}`;
    }
    case "swap":
      return `Swap ${amt} ${tx.asset} (${chainShort(tx.chain)})`;
    default:
      return `${amt} ${tx.asset}`;
  }
}

export interface TransactionItemProps {
  tx: TickerTransaction;
  compact?: boolean;
  showTime?: boolean;
}

function TransactionItemInner({ tx, compact = false, showTime = true }: TransactionItemProps) {
  const reduceMotion = useReducedMotion();
  const Icon = txIcons[tx.type] ?? Send;
  const time = new Date(tx.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  if (compact) {
    return (
      <motion.div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-xs font-mono backdrop-blur",
          "min-h-[2.5rem]"
        )}
        whileHover={reduceMotion ? undefined : { scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 24 }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          <span className="truncate text-slate-200">{summaryLine(tx, true)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "tabular-nums text-slate-500",
              tx.status === "pending" && "text-amber-400",
              tx.status === "failed" && "text-red-400"
            )}
          >
            {tx.status === "failed" ? "✘" : tx.status === "pending" ? "⟳" : "✔"}{" "}
            {tx.age.replace(" ago", "")}
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mx-2 flex h-full shrink-0 items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 px-6 py-3 text-sm font-mono backdrop-blur md:gap-4"
      whileHover={reduceMotion ? undefined : { scale: 1.02, y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {showTime && (
        <span className="w-[72px] shrink-0 text-right text-xs font-bold tabular-nums text-emerald-400 md:text-sm">
          {time}
        </span>
      )}

      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
        <span
          className={cn(
            "font-bold uppercase",
            tx.status === "pending" && "text-amber-400",
            tx.status === "failed" && "text-red-400",
            tx.status === "confirmed" && "text-white"
          )}
        >
          {tx.type}
        </span>
      </div>

      <div className="min-w-[88px] text-right">
        <span className="text-base font-black text-emerald-400 md:text-lg">
          {tx.amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })}
        </span>
        <span className="ml-1 text-xs uppercase tracking-wider text-slate-400">{tx.asset}</span>
      </div>

      <span className="hidden max-w-[200px] truncate text-slate-400 lg:inline">
        {tx.type === "received" ? "← " : "→ "}
        {formatAddress(tx.to, false)}
      </span>

      <div className="flex items-center gap-1 rounded-lg bg-slate-700/50 px-2 py-1">
        <span className="text-xs font-mono uppercase text-slate-200">{chainShort(tx.chain)}</span>
        {tx.chainTo && (
          <>
            <span className="text-slate-500">→</span>
            <span className="text-xs font-mono uppercase text-slate-200">{chainShort(tx.chainTo)}</span>
          </>
        )}
      </div>

      <span className="ml-auto hidden text-xs text-slate-500 xl:inline">Gas: {tx.gas}</span>

      <div
        className={cn(
          "ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs",
          tx.status === "confirmed" && "border-emerald-500/50 bg-emerald-500/20 text-emerald-300",
          tx.status === "pending" && "animate-pulse border-amber-500/50 bg-amber-500/20 text-amber-200",
          tx.status === "failed" && "border-red-500/50 bg-red-500/20 text-red-300"
        )}
      >
        {tx.status === "confirmed" ? "✔" : tx.status === "pending" ? "⟳" : "✘"}
      </div>

      <span className="hidden w-[88px] shrink-0 text-right text-xs tabular-nums text-slate-400 sm:inline">
        {tx.age}
      </span>
    </motion.div>
  );
}

export const TransactionItem = memo(
  TransactionItemInner,
  (prev, next) =>
    prev.tx.id === next.tx.id &&
    prev.tx.status === next.tx.status &&
    prev.tx.age === next.tx.age &&
    prev.compact === next.compact &&
    prev.showTime === next.showTime
);
