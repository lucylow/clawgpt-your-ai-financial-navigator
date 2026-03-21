import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { buildTransactionsCsv, downloadTextFile } from "@/lib/exportReport";
import type { Transaction } from "@/types";

type TypeFilter = "all" | Transaction["type"];
type StatusFilter = "all" | Transaction["status"];

function matchesQuery(tx: Transaction, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  const hay = [
    tx.hash,
    tx.type,
    tx.asset,
    tx.fromChain,
    tx.toChain,
    tx.toAddress,
    tx.status,
    String(tx.amount),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

export default function TransactionsPage() {
  const { transactions } = usePortfolioStore();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      return matchesQuery(tx, query);
    });
  }, [transactions, query, typeFilter, statusFilter]);

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const body = buildTransactionsCsv(filtered.length ? filtered : transactions);
    downloadTextFile(`clawgpt-transactions-${stamp}.csv`, body);
  };

  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Transaction history</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 self-start sm:self-auto"
          onClick={exportCsv}
          disabled={transactions.length === 0}
        >
          <Download className="h-4 w-4" aria-hidden />
          Export CSV
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-border/40 bg-card/40 p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search hash, chain, type, asset, address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Search activity"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">Type</span>
          <ToggleGroup
            type="single"
            value={typeFilter}
            onValueChange={(v) => v && setTypeFilter(v as TypeFilter)}
            variant="outline"
            size="sm"
            className="flex-wrap justify-start"
          >
            {(["all", "send", "receive", "swap", "bridge"] as const).map((t) => (
              <ToggleGroupItem key={t} value={t} className="text-xs capitalize px-2.5">
                {t}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">Status</span>
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v as StatusFilter)}
            variant="outline"
            size="sm"
            className="flex-wrap justify-start"
          >
            {(["all", "pending", "confirmed", "failed"] as const).map((s) => (
              <ToggleGroupItem key={s} value={s} className="text-xs capitalize px-2.5">
                {s}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="tabular-nums text-foreground font-medium">{filtered.length}</span> of{" "}
          <span className="tabular-nums">{transactions.length}</span>
          {filtered.length !== transactions.length ? " (filters applied)" : ""}
        </p>
      </div>

      <div className="space-y-2">
        {filtered.map((tx) => (
          <div
            key={tx.hash}
            className="glass-card rounded-xl p-3 sm:p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium text-foreground break-words">
                {tx.type === "send" ? "Sent" : tx.type === "receive" ? "Received" : tx.type === "swap" ? "Swapped" : "Bridged"}{" "}
                {tx.amount} {tx.asset}
              </p>
              <p className="text-xs text-muted-foreground break-all">
                {tx.fromChain} → {tx.toChain} · {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
              </p>
              <p className="text-[11px] text-muted-foreground/90 font-mono break-all">{tx.hash}</p>
            </div>
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full shrink-0 self-start sm:self-auto",
                tx.status === "confirmed"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : tx.status === "pending"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-destructive/20 text-destructive",
              )}
            >
              {tx.status}
            </span>
          </div>
        ))}

        {filtered.length === 0 && transactions.length > 0 && (
          <p className="text-center text-muted-foreground py-12">No transactions match your search or filters.</p>
        )}
        {transactions.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No transactions yet.</p>
        )}
      </div>
    </div>
  );
}
