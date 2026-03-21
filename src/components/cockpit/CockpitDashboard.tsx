import { useMemo } from "react";
import { Activity, Layers, Wallet } from "lucide-react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import CockpitGlobe from "./CockpitGlobe";
import PortfolioChart from "./PortfolioChart";
import ChainHeatmap from "./ChainHeatmap";
import CockpitInsightPanels from "./CockpitInsightPanels";
import Ticker from "./Ticker";

export default function CockpitDashboard() {
  const { totalValue, allocation, allocationByAsset } = usePortfolioStore();

  const safeTotalValue = Number.isFinite(totalValue) && totalValue >= 0 ? totalValue : 0;

  const activeChains = useMemo(
    () => Object.entries(allocation).filter(([, v]) => v > 0).length,
    [allocation]
  );

  const { usdtNav, xautNav, usdtPct, xautPct } = useMemo(() => {
    let u = 0;
    let x = 0;
    for (const row of Object.values(allocationByAsset ?? {})) {
      u += row?.USDt ?? 0;
      x += row?.XAUt ?? 0;
    }
    const nav = u + x;
    const up = nav > 0 ? Math.round((u / nav) * 1000) / 10 : 0;
    const xp = nav > 0 ? Math.round((x / nav) * 1000) / 10 : 0;
    return { usdtNav: u, xautNav: x, usdtPct: up, xautPct: xp };
  }, [allocationByAsset]);

  return (
    <div
      className="flex flex-col h-full p-4 gap-4 overflow-y-auto"
      role="region"
      aria-label="Cockpit operations overview"
    >
      <header className="flex flex-col gap-1 shrink-0">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Operational overview</h2>
        <p className="text-xs text-muted-foreground">
          Live allocation, chain exposure, and activity — synced with Claw and your wallet state.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-lg px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-primary/15 p-2 text-primary">
            <Wallet className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net portfolio</p>
            <p className="text-lg font-semibold tabular-nums">${safeTotalValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="glass-card rounded-lg px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-emerald-500/15 p-2 text-emerald-400">
            <Layers className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active chains</p>
            <p className="text-lg font-semibold tabular-nums">{activeChains}</p>
          </div>
        </div>
        <div className="glass-card rounded-lg px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-amber-500/15 p-2 text-amber-400">
            <Activity className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">USDt / XAUt mix</p>
            <p className="text-lg font-semibold tabular-nums">
              {usdtPct.toFixed(0)}% / {xautPct.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      <section aria-labelledby="cockpit-globe-metrics-heading" className="space-y-2">
        <h2 id="cockpit-globe-metrics-heading" className="sr-only">
          Globe and headline balances
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl overflow-hidden h-[280px]">
            <CockpitGlobe allocation={allocation} />
          </div>
          <div className="glass-card rounded-xl p-6 flex flex-col justify-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total portfolio</p>
            <p className="text-4xl font-bold text-foreground mb-4 tabular-nums">
              ${safeTotalValue.toLocaleString()}
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">USDt</span>
                <span className="text-lg font-semibold text-foreground tabular-nums">
                  ${Math.round(usdtNav).toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60 transition-[width] duration-500"
                  style={{ width: `${usdtPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">XAUt</span>
                <span className="text-lg font-semibold text-foreground tabular-nums">
                  ${Math.round(xautNav).toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500/50 transition-[width] duration-500"
                  style={{ width: `${xautPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="cockpit-trends-heading" className="space-y-2">
        <h2 id="cockpit-trends-heading" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Trends & exposure
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PortfolioChart />
          <ChainHeatmap />
        </div>
      </section>

      <CockpitInsightPanels />

      <section aria-labelledby="cockpit-ticker-heading" className="space-y-2">
        <h2 id="cockpit-ticker-heading" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Live activity
        </h2>
        <Ticker />
      </section>
    </div>
  );
}
