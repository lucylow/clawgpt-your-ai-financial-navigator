import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { COCKPIT_CHAIN_NODES, CHAIN_COLOR_BY_ID } from "@/config/cockpitChainNodes";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type ViewMode = "bars" | "chart";

export default function ChainHeatmap() {
  const { allocation, allocationByAsset, totalValue } = usePortfolioStore();
  const [view, setView] = useState<ViewMode>("bars");
  const isMobile = useIsMobile();

  const rows = useMemo(() => {
    const sorted = [...Object.entries(allocation)].sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...sorted.map(([, v]) => v), 1);
    return sorted.map(([chain, value]) => {
      const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const heat = maxVal > 0 ? value / maxVal : 0;
      const meta = COCKPIT_CHAIN_NODES.find((n) => n.id === chain);
      const color = CHAIN_COLOR_BY_ID[chain] ?? "hsl(220, 20%, 45%)";
      const usdt = allocationByAsset[chain]?.USDt ?? 0;
      const xaut = allocationByAsset[chain]?.XAUt ?? 0;
      return {
        chain,
        value,
        pct,
        heat,
        label: meta?.label ?? chain.charAt(0).toUpperCase() + chain.slice(1),
        color,
        usdt,
        xaut,
      };
    });
  }, [allocation, allocationByAsset, totalValue]);

  const barView = (
    <div className="space-y-3 flex-1">
      {rows.map(({ chain, value, pct, heat, label, color, usdt, xaut }) => (
        <div key={chain} className="group">
          <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-white/10"
                style={{ backgroundColor: color }}
              />
              <span className="text-foreground font-medium truncate">{label}</span>
            </span>
            <span className="text-foreground tabular-nums shrink-0 font-mono text-[11px]">
              ${Math.round(value).toLocaleString()}
            </span>
          </div>
          {/* Stacked bar: USDt + XAUt */}
          <div className="relative h-3 rounded-full bg-secondary/50 overflow-hidden">
            {value > 0 && (
              <>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${(usdt / (value || 1)) * pct}%`,
                    background: color,
                    opacity: 0.5 + heat * 0.5,
                  }}
                />
                <div
                  className="absolute inset-y-0 rounded-full transition-all duration-700"
                  style={{
                    left: `${(usdt / (value || 1)) * pct}%`,
                    width: `${(xaut / (value || 1)) * pct}%`,
                    background: `${color}88`,
                    opacity: 0.4 + heat * 0.4,
                  }}
                />
              </>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span className="tabular-nums">USDt ${usdt.toLocaleString()}</span>
            {xaut > 0 && <span className="tabular-nums">XAUt ${xaut.toLocaleString()}</span>}
            <span className="ml-auto tabular-nums">{pct.toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  );

  const chartView = (
    <div className="flex-1 w-full" style={{ height: isMobile ? 200 : 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barCategoryGap="20%">
          <XAxis
            dataKey="label"
            tick={{ fontSize: isMobile ? 9 : 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
              padding: "8px 12px",
              boxShadow: "0 8px 32px hsl(var(--background) / 0.5)",
            }}
            formatter={(v: number, name: string) => [
              `$${v.toLocaleString()}`,
              name === "usdt" ? "USDt" : "XAUt",
            ]}
            labelFormatter={(l) => String(l)}
          />
          <Bar dataKey="usdt" stackId="a" radius={[0, 0, 4, 4]} name="usdt">
            {rows.map((entry) => (
              <Cell key={entry.chain} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
          <Bar dataKey="xaut" stackId="a" radius={[4, 4, 0, 0]} name="xaut">
            {rows.map((entry) => (
              <Cell key={entry.chain} fill={entry.color} fillOpacity={0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Chain exposure</p>
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
            USDt (solid) + XAUt (lighter) per chain
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setView("bars")}
            className={cn(
              "px-2 py-1 rounded-md text-[10px] transition-colors",
              view === "bars"
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Bars
          </button>
          <button
            type="button"
            onClick={() => setView("chart")}
            className={cn(
              "px-2 py-1 rounded-md text-[10px] transition-colors",
              view === "chart"
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Chart
          </button>
        </div>
      </div>
      {view === "bars" ? barView : chartView}
    </div>
  );
}
