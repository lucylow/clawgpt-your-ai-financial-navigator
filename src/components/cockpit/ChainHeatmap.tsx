import { useMemo } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { COCKPIT_CHAIN_NODES, CHAIN_COLOR_BY_ID } from "@/config/cockpitChainNodes";
import { cn } from "@/lib/utils";

export default function ChainHeatmap() {
  const { allocation, totalValue } = usePortfolioStore();

  const rows = useMemo(() => {
    const sorted = [...Object.entries(allocation)].sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...sorted.map(([, v]) => v), 1);
    return sorted.map(([chain, value]) => {
      const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const heat = maxVal > 0 ? value / maxVal : 0;
      const meta = COCKPIT_CHAIN_NODES.find((n) => n.id === chain);
      const color = CHAIN_COLOR_BY_ID[chain] ?? "hsl(220, 20%, 45%)";
      return { chain, value, pct, heat, label: meta?.label ?? chain, color };
    });
  }, [allocation, totalValue]);

  return (
    <div className="glass-card rounded-xl p-4 h-full flex flex-col">
      <div className="mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Chain exposure</p>
        <p className="text-[10px] text-muted-foreground/90 mt-0.5">
          Heat intensity = share of largest chain position
        </p>
      </div>
      <div className="space-y-2.5 flex-1">
        {rows.map(({ chain, value, pct, heat, label, color }) => (
          <div key={chain} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0 ring-1 ring-white/10"
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize text-foreground truncate">{label}</span>
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0">
                {pct.toFixed(0)}% · ${Math.round(value).toLocaleString()}
              </span>
            </div>
            <div
              className="h-2 rounded-md bg-secondary/80 overflow-hidden ring-1 ring-inset ring-border/30"
              title={`${label}: ${pct.toFixed(1)}% of portfolio`}
            >
              <div
                className={cn("h-full rounded-md transition-all duration-500")}
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}33, ${color})`,
                  opacity: 0.35 + heat * 0.65,
                  boxShadow: heat > 0.15 ? `0 0 12px ${color}55` : undefined,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
