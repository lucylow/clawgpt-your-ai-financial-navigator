import { useMemo } from "react";
import { Activity, Compass, Layers, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import CockpitGlobe from "./CockpitGlobe";
import PortfolioChart from "./PortfolioChart";
import ChainHeatmap from "./ChainHeatmap";
import CockpitInsightPanels from "./CockpitInsightPanels";
import Ticker from "./Ticker";
import { MetricTile } from "./MetricTile";

export default function CockpitDashboard() {
  const { totalValue, allocation, allocationByAsset, agent } = usePortfolioStore();
  const sessionImpact = agent.sessionImpact;

  const safeTotalValue = Number.isFinite(totalValue) && totalValue >= 0 ? totalValue : 0;

  const activeChains = useMemo(
    () => Object.entries(allocation).filter(([, v]) => v > 0).length,
    [allocation]
  );

  const nextStepContent = useMemo(() => {
    if (safeTotalValue <= 0) {
      return (
        <>
          Connect a wallet or use demo mode, then ask Claw for a balance breakdown by chain.
        </>
      );
    }
    const entries = Object.entries(allocation).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      return <>Ask Claw where your USDt and XAUt sit — the map and ticker update as you act.</>;
    }
    const top = entries.reduce((a, b) => (a[1] >= b[1] ? a : b));
    const share = top[1] / safeTotalValue;
    if (share > 0.55) {
      return (
        <>
          Most of your balance is on <strong className="text-foreground/90">{top[0]}</strong> — ask Claw whether to
          rebalance or compare fees before moving funds.
        </>
      );
    }
    return (
      <>
        Ask Claw for a quick transfer <strong className="text-foreground/90">preview</strong> (amount, chain, fees)
        before you sign anything.
      </>
    );
  }, [allocation, safeTotalValue]);

  const hasSessionStats = useMemo(() => {
    const s = sessionImpact;
    return Boolean(s.userTurns || s.structuredPreviews || s.confirmedActions || s.preventedMistakes);
  }, [sessionImpact]);

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
      className="flex flex-col h-full min-h-0 p-3 gap-3 overflow-y-auto sm:p-4 sm:gap-4"
      role="region"
      aria-label="Cockpit operations overview"
    >
      <header className="flex flex-col gap-1 shrink-0">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Operational overview</h2>
        <p className="text-xs text-muted-foreground">
          One place to see allocation, chain exposure, and activity — built for decisions, not just charts.
        </p>
      </header>

      <section
        aria-labelledby="cockpit-next-step-heading"
        className="rounded-xl border border-border/40 bg-secondary/15 px-3 py-2.5 sm:px-4"
      >
        <div className="flex items-start gap-2">
          <Compass className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden />
          <div className="min-w-0">
            <h2 id="cockpit-next-step-heading" className="text-xs font-semibold text-foreground">
              Suggested next step
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-snug">{nextStepContent}</p>
          </div>
        </div>
      </section>

      {hasSessionStats ? (
        <section
          aria-label="Assistant session value"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
        >
          <div className="rounded-lg border border-border/30 bg-background/30 px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary/90" aria-hidden />
              Questions
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">{sessionImpact.userTurns}</p>
          </div>
          <div className="rounded-lg border border-border/30 bg-background/30 px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Activity className="h-3 w-3 text-sky-400/90" aria-hidden />
              Previews
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">{sessionImpact.structuredPreviews}</p>
          </div>
          <div className="rounded-lg border border-border/30 bg-background/30 px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Wallet className="h-3 w-3 text-emerald-400/90" aria-hidden />
              Confirmed
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">{sessionImpact.confirmedActions}</p>
          </div>
          <div className="rounded-lg border border-border/30 bg-background/30 px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-amber-400/90" aria-hidden />
              Stopped (safety)
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">{sessionImpact.preventedMistakes}</p>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <MetricTile label="Net portfolio" icon={Wallet} value={`$${safeTotalValue.toLocaleString()}`} />
        <MetricTile
          label="Active chains"
          icon={Layers}
          value={activeChains}
          iconClassName="bg-emerald-500/15 text-emerald-400"
        />
        <MetricTile
          label="USDt / XAUt mix"
          icon={Activity}
          value={`${usdtPct.toFixed(0)}% / ${xautPct.toFixed(0)}%`}
          iconClassName="bg-amber-500/15 text-amber-400"
        />
      </div>

      <section aria-labelledby="cockpit-globe-metrics-heading" className="space-y-2">
        <h2 id="cockpit-globe-metrics-heading" className="sr-only">
          Globe and headline balances
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
          <div className="glass-card rounded-xl overflow-hidden h-[220px] sm:h-[260px] lg:h-[280px] min-h-0">
            <CockpitGlobe allocation={allocation} />
          </div>
          <div className="glass-card rounded-xl p-4 sm:p-6 flex flex-col justify-center min-h-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total portfolio</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4 tabular-nums">
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
