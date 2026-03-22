import { useId, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { buildSyntheticHistory, historyRangeLabel, type HistoryRange } from "@/lib/portfolioHistory";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { CHAIN_COLOR_BY_ID } from "@/config/cockpitChainNodes";
import { useIsMobile } from "@/hooks/use-mobile";

const RANGES: HistoryRange[] = ["24h", "7d", "30d", "90d"];

const PIE_COLORS = [
  "hsl(204, 100%, 55%)",
  "hsl(160, 60%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(35, 90%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(180, 55%, 50%)",
];

export type PortfolioChartProps = {
  embedded?: boolean;
};

export default function PortfolioChart({ embedded = false }: PortfolioChartProps) {
  const totalValue = usePortfolioStore((s) => s.totalValue);
  const allocation = usePortfolioStore((s) => s.allocation);
  const allocationByAsset = usePortfolioStore((s) => s.allocationByAsset);
  const [range, setRange] = useState<HistoryRange>("7d");
  const [activeView, setActiveView] = useState<"area" | "pie">("area");
  const gradId = useId().replace(/:/g, "");
  const isMobile = useIsMobile();

  const safeHistory = useMemo(() => {
    const end = Number.isFinite(totalValue) && totalValue >= 0 ? totalValue : 0;
    return buildSyntheticHistory(end, range).filter((point) => Number.isFinite(point.value));
  }, [totalValue, range]);

  const changePct = useMemo(() => {
    if (safeHistory.length < 2) return 0;
    const first = safeHistory[0].value;
    const last = safeHistory[safeHistory.length - 1].value;
    if (!first) return 0;
    return ((last - first) / first) * 100;
  }, [safeHistory]);

  const pieData = useMemo(() => {
    return Object.entries(allocation)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([chain, value], i) => ({
        name: chain.charAt(0).toUpperCase() + chain.slice(1),
        value,
        pct: totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : "0",
        color: CHAIN_COLOR_BY_ID[chain] ?? PIE_COLORS[i % PIE_COLORS.length],
        usdt: allocationByAsset[chain]?.USDt ?? 0,
        xaut: allocationByAsset[chain]?.XAUt ?? 0,
      }));
  }, [allocation, allocationByAsset, totalValue]);

  const minMax = useMemo(() => {
    if (safeHistory.length === 0) return { min: 0, max: 0 };
    let min = safeHistory[0].value;
    let max = safeHistory[0].value;
    safeHistory.forEach((p) => {
      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;
    });
    return { min, max };
  }, [safeHistory]);

  if (safeHistory.length === 0 && pieData.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl p-4 h-full flex items-center justify-center text-sm text-muted-foreground",
          !embedded && "glass-card",
        )}
      >
        No chart data available.
      </div>
    );
  }

  const pad = Math.max(1, Math.round((minMax.max - minMax.min) * 0.08)) || 1;

  const areaChart = (
    <div className="w-full" style={{ height: isMobile ? 200 : 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safeHistory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} strokeOpacity={0.3} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: isMobile ? 9 : 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={isMobile ? 40 : 30}
          />
          <YAxis
            hide
            domain={[minMax.min - pad, minMax.max + pad]}
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
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
            formatter={(v: number) => [`$${v.toLocaleString()}`, "NAV"]}
            labelFormatter={(l) => String(l)}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill={`url(#${gradId})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, stroke: "hsl(var(--primary))", strokeWidth: 2, fill: "hsl(var(--background))" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const pieChart = (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
      <div className="shrink-0" style={{ width: isMobile ? 160 : 200, height: isMobile ? 160 : 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 40 : 55}
              outerRadius={isMobile ? 70 : 90}
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {pieData.map((entry, i) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                fontSize: 12,
                padding: "8px 12px",
                boxShadow: "0 8px 32px hsl(var(--background) / 0.5)",
              }}
              formatter={(v: number, name: string) => [`$${v.toLocaleString()}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-1 gap-2 w-full">
        {pieData.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs min-w-0">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="truncate text-foreground">{d.name}</span>
            <span className="ml-auto tabular-nums text-muted-foreground shrink-0">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  const shell = (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
              ${totalValue.toLocaleString()}
            </p>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-md",
                changePct >= 0
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-rose-400 bg-rose-500/10",
              )}
            >
              {changePct >= 0 ? "↑" : "↓"} {Math.abs(changePct).toFixed(2)}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {historyRangeLabel(range)} · synthetic
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <ToggleGroup
            type="single"
            value={activeView}
            onValueChange={(v) => v && setActiveView(v as "area" | "pie")}
            variant="outline"
            size="sm"
            aria-label="Chart type"
          >
            <ToggleGroupItem value="area" className="px-2 text-[10px]">NAV</ToggleGroupItem>
            <ToggleGroupItem value="pie" className="px-2 text-[10px]">Split</ToggleGroupItem>
          </ToggleGroup>
          {activeView === "area" && (
            <ToggleGroup
              type="single"
              value={range}
              onValueChange={(v) => v && setRange(v as HistoryRange)}
              variant="outline"
              size="sm"
              aria-label="Time range"
            >
              {RANGES.map((r) => (
                <ToggleGroupItem key={r} value={r} className="px-2 text-[10px] uppercase tracking-wide">
                  {r}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0">
        {activeView === "area" ? areaChart : pieChart}
      </div>
    </div>
  );

  if (embedded) return shell;
  return <div className="glass-card rounded-xl p-4 h-full flex flex-col min-h-0">{shell}</div>;
}
