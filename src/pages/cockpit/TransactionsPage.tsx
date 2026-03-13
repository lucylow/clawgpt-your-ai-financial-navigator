import { usePortfolioStore } from "@/store/usePortfolioStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
  const { transactions } = usePortfolioStore();

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>

      <div className="space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.hash}
            className="glass-card rounded-xl p-4 flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {tx.type === "send" ? "Sent" : tx.type === "receive" ? "Received" : "Bridged"}{" "}
                {tx.amount} {tx.asset}
              </p>
              <p className="text-xs text-muted-foreground">
                {tx.fromChain} → {tx.toChain} · {formatDistanceToNow(tx.timestamp)} ago
              </p>
            </div>
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full",
                tx.status === "confirmed"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : tx.status === "pending"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-destructive/20 text-destructive"
              )}
            >
              {tx.status}
            </span>
          </div>
        ))}

        {transactions.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No transactions yet.</p>
        )}
      </div>
    </div>
  );
}
