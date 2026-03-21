import { useMemo } from "react";
import {
  AlertTriangle,
  Eye,
  LineChart,
  Percent,
  Scale,
  Shield,
  TrendingUp,
} from "lucide-react";
import { CHAIN_COLOR_BY_ID } from "@/config/cockpitChainNodes";
import { usePortfolioStore } from "@/store/usePortfolioStore";

function stableSignedPct(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i) * (i + 3)) % 9973;
  }
  return Math.round((h / 9973) * 1000) / 100 - 5;
}

function YieldOpportunitiesPanel() {
  const { allocation } = usePortfolioStore();

  const rows = useMemo(() => {
    const templates = [
      { pool: "Curve 3pool (USDt)", baseApy: 4.2 },
      { pool: "Aave USDT supply", baseApy: 3.8 },
      { pool: "XAUt / USDt stable LP", baseApy: 6.1 },
      { pool: "Bridge liquidity incentives", baseApy: 8.4 },
    ];
    const chains = Object.keys(allocation).filter((c) => (allocation[c] ?? 0) > 0);
    const pick = (i: number) => chains[i % Math.max(chains.length, 1)] ?? "ethereum";
    return templates.map((t, i) => {
      const chain = pick(i);
      const jitter = stableSignedPct(`yield-${chain}-${i}`) * 0.08;
      const apy = Math.max(0.1, t.baseApy + jitter);
      const risk: "Low" | "Med" | "High" = apy > 7 ? "Med" : "Low";
      return { ...t, chain, apy, risk };
    });
  }, [allocation]);

  return (
    <div className="glass-card rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-md bg-emerald-500/15 p-1.5 text-emerald-400">
          <Percent className="h-3.5 w-3.5" aria-hidden />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Yield opportunities</p>
      </div>
      <ul className="space-y-2.5 flex-1 min-h-0">
        {rows.map((row) => (
          <li
            key={row.pool}
            className="flex items-start justify-between gap-2 text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{row.pool}</p>
              <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{row.chain}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="tabular-nums font-semibold text-emerald-400">{row.apy.toFixed(1)}% APY</p>
              <p className="text-[10px] text-muted-foreground">{row.risk} risk</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChainExposureDetailPanel() {
  const { allocation, allocationByAsset, totalValue } = usePortfolioStore();

  const rows = useMemo(() => {
    return Object.entries(allocation)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([chain, chainTotal]) => {
        const assets = allocationByAsset[chain] ?? {};
        const usdt = assets.USDt ?? 0;
        const xaut = assets.XAUt ?? 0;
        const pct = totalValue > 0 ? (chainTotal / totalValue) * 100 : 0;
        return { chain, usdt, xaut, chainTotal, pct };
      });
  }, [allocation, allocationByAsset, totalValue]);

  return (
    <div className="glass-card rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-md bg-sky-500/15 p-1.5 text-sky-400">
          <Scale className="h-3.5 w-3.5" aria-hidden />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Chain-by-chain exposure</p>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border/50">
              <th className="pb-2 font-medium">Chain</th>
              <th className="pb-2 font-medium text-right">USDt</th>
              <th className="pb-2 font-medium text-right">XAUt</th>
              <th className="pb-2 font-medium text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ chain, usdt, xaut, pct }) => (
              <tr key={chain} className="border-b border-border/30 last:border-0">
                <td className="py-2 pr-2">
                  <span className="inline-flex items-center gap-1.5 capitalize">
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: CHAIN_COLOR_BY_ID[chain] ?? "hsl(220, 10%, 45%)" }}
                    />
                    {chain}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums text-foreground">${Math.round(usdt).toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums text-foreground">${Math.round(xaut).toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">{pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiskScoringPanel() {
  const { allocation, totalValue } = usePortfolioStore();

  const { score, label, detail } = useMemo(() => {
    const entries = Object.values(allocation).filter((v) => v > 0);
    const tv = totalValue > 0 ? totalValue : 1;
    const shares = entries.map((v) => v / tv);
    const hhi = shares.reduce((s, w) => s + w * w, 0);
    const raw = Math.round(Math.min(100, Math.max(0, hhi * 100)));
    let label: string;
    if (raw < 28) label = "Diversified";
    else if (raw < 45) label = "Balanced";
    else if (raw < 65) label = "Concentrated";
    else label = "High concentration";
    const detail =
      entries.length <= 1
        ? "Single-chain exposure increases tail risk."
        : `Herfindahl ~${(hhi * 100).toFixed(0)} — lower is more diversified.`;
    return { score: raw, label, detail };
  }, [allocation, totalValue]);

  return (
    <div className="glass-card rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-md bg-violet-500/15 p-1.5 text-violet-400">
          <Shield className="h-3.5 w-3.5" aria-hidden />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Risk scoring</p>
      </div>
      <div className="flex items-end gap-3 mb-2">
        <p className="text-3xl font-bold tabular-nums text-foreground">{score}</p>
        <p className="text-xs text-muted-foreground pb-1">/ 100 concentration</p>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{detail}</p>
      <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-amber-500/90 transition-[width] duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function PositionPerformancePanel() {
  const { allocation } = usePortfolioStore();

  const rows = useMemo(() => {
    return Object.entries(allocation)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([chain, value]) => {
        const pnl = stableSignedPct(`perf-${chain}`);
        return { chain, value, pnl };
      });
  }, [allocation]);

  return (
    <div className="glass-card rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-md bg-amber-500/15 p-1.5 text-amber-400">
          <LineChart className="h-3.5 w-3.5" aria-hidden />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Position performance</p>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">Session P&amp;L by chain (est.)</p>
      <ul className="space-y-2 flex-1">
        {rows.map(({ chain, value, pnl }) => (
          <li key={chain} className="flex items-center justify-between gap-2 text-xs">
            <span className="capitalize text-foreground truncate">{chain}</span>
            <span className="text-muted-foreground tabular-nums shrink-0">${Math.round(value).toLocaleString()}</span>
            <span
              className={`tabular-nums font-medium shrink-0 w-14 text-right ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DebtLiabilityPanel() {
  const { totalValue } = usePortfolioStore();

  const { borrowed, creditLine, utilization } = useMemo(() => {
    const creditLine = Math.max(5000, Math.round(totalValue * 0.35));
    const borrowed = Math.round(Math.min(creditLine * 0.22, totalValue * 0.08));
    const utilization = creditLine > 0 ? Math.round((borrowed / creditLine) * 1000) / 10 : 0;
    return { borrowed, creditLine, utilization };
  }, [totalValue]);

  return (
    <div className="glass-card rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-md bg-rose-500/15 p-1.5 text-rose-400">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Debt &amp; liabilities</p>
      </div>
      <div className="space-y-3 flex-1">
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-xs text-muted-foreground">Stable borrow (USDT)</span>
          <span className="text-sm font-semibold tabular-nums">${borrowed.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-xs text-muted-foreground">Credit line</span>
          <span className="text-xs tabular-nums text-foreground">${creditLine.toLocaleString()}</span>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Utilization</span>
            <span className="tabular-nums">{utilization.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-rose-500/70 transition-[width] duration-500"
              style={{ width: `${Math.min(100, utilization)}%` }}
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
          Borrowing is simulated from portfolio size for cockpit preview; connect lending protocols for live balances.
        </p>
      </div>
    </div>
  );
}

const WATCH_DEFAULT = [
  { symbol: "USDt", note: "Peg & liquidity" },
  { symbol: "XAUt", note: "Gold nav" },
  { symbol: "ETH", note: "Gas / L1" },
  { symbol: "ARB", note: "Arbitrum gov" },
] as const;

function WatchlistPanel() {
  const rows = useMemo(() => {
    return WATCH_DEFAULT.map((w, i) => ({
      ...w,
      change: stableSignedPct(`watch-${w.symbol}-${i}`),
    }));
  }, []);

  return (
    <div className="glass-card rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-md bg-cyan-500/15 p-1.5 text-cyan-400">
          <Eye className="h-3.5 w-3.5" aria-hidden />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Watchlists</p>
      </div>
      <ul className="space-y-2.5 flex-1">
        {rows.map((row) => (
          <li
            key={row.symbol}
            className="flex items-center justify-between gap-2 text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0"
          >
            <div>
              <p className="font-medium text-foreground">{row.symbol}</p>
              <p className="text-[10px] text-muted-foreground">{row.note}</p>
            </div>
            <span
              className={`tabular-nums font-semibold shrink-0 ${row.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {row.change >= 0 ? "+" : ""}
              {row.change.toFixed(2)}%
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
        <TrendingUp className="h-3 w-3 opacity-70" aria-hidden />
        24h change (demo feed)
      </p>
    </div>
  );
}

export default function CockpitInsightPanels() {
  return (
    <section aria-labelledby="cockpit-insights-heading" className="space-y-2">
      <h2 id="cockpit-insights-heading" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Insights &amp; risk
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <YieldOpportunitiesPanel />
        <ChainExposureDetailPanel />
        <RiskScoringPanel />
        <PositionPerformancePanel />
        <DebtLiabilityPanel />
        <WatchlistPanel />
      </div>
    </section>
  );
}
