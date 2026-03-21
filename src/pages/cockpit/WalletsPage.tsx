import { Wallet } from "lucide-react";
import { useMemo } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";

function titleCaseChain(chain: string): string {
  if (chain === "ethereum") return "Ethereum";
  if (chain === "polygon") return "Polygon";
  if (chain === "arbitrum") return "Arbitrum";
  if (chain === "solana") return "Solana";
  if (chain === "tron") return "Tron";
  if (chain === "ton") return "TON";
  return chain.slice(0, 1).toUpperCase() + chain.slice(1);
}

export default function WalletsPage() {
  const wallets = usePortfolioStore((s) => s.wallets);
  const allocation = usePortfolioStore((s) => s.allocation);

  const rows = useMemo(() => {
    return wallets.map((w) => {
      const usd = allocation[w.chain] ?? 0;
      return {
        ...w,
        labelChain: titleCaseChain(w.chain),
        balanceLabel: `$${Math.round(usd).toLocaleString()}`,
      };
    });
  }, [wallets, allocation]);

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Wallets</h1>
        <span className="text-xs text-muted-foreground">
          Live from cockpit store · WDK updates addresses when connected
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((w) => (
          <div key={w.id} className="glass-card rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{w.labelChain}</p>
                <p className="text-xs text-muted-foreground font-mono">{w.address}</p>
                {w.nativeSymbol && (
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">Gas: {w.nativeSymbol}</p>
                )}
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">{w.balanceLabel}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
