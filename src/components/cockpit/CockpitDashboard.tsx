import { useMemo } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import CockpitGlobe from "./CockpitGlobe";
import PortfolioChart from "./PortfolioChart";
import ChainHeatmap from "./ChainHeatmap";
import Ticker from "./Ticker";

export default function CockpitDashboard() {
  const { totalValue, allocation } = usePortfolioStore();

  const safeTotalValue = Number.isFinite(totalValue) && totalValue >= 0 ? totalValue : 0;
  const chainTotal = useMemo(
    () => Object.values(allocation ?? {}).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0),
    [allocation]
  );

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      {/* Top: Globe + Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl overflow-hidden h-[280px]">
          <CockpitGlobe />
        </div>
        <div className="glass-card rounded-xl p-6 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total Portfolio</p>
          <p className="text-4xl font-bold text-foreground mb-4">
            ${safeTotalValue.toLocaleString()}
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">USDt</span>
              <span className="text-lg font-semibold text-foreground">${Math.round(chainTotal * 0.65).toLocaleString()}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-[65%] rounded-full bg-primary/60" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">XAUt</span>
              <span className="text-lg font-semibold text-foreground">${Math.round(chainTotal * 0.35).toLocaleString()}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-[35%] rounded-full bg-primary/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Mid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PortfolioChart />
        <ChainHeatmap />
      </div>

      {/* Bottom: Ticker */}
      <Ticker />
    </div>
  );
}
