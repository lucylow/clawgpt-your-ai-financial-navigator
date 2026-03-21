import { useId, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { buildSyntheticHistory, historyRangeLabel, type HistoryRange } from "@/lib/portfolioHistory";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const RANGES: HistoryRange[] = ["24h", "7d", "30d", "90d"];

export type PortfolioChartProps = {
  /** Strip outer glass card when nested inside another panel (e.g. Portfolio page). */
  embedded?: boolean;
};

export default function PortfolioChart({ embedded = false }: PortfolioChartProps) {
  const totalValue = usePortfolioStore((s) => s.totalValue);
  const [range, setRange] = useState<HistoryRange>("7d");
  const gradId = useId().replace(/:/g, "");

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

  const minMax = useMemo(() => {
    if (safeHistory.length === 0) return { min: 0, max: 0, minIdx: 0, maxIdx: 0 };
    let min = safeHistory[0].value;
    let max = safeHistory[0].value;
    let minIdx = 0;
    let maxIdx = 0;
    safeHistory.forEach((p, i) => {
      if (p.value < min) {
        min = p.value;
        minIdx = i;
      }
      if (p.value > max) {
        max = p.value;
        maxIdx = i;
      }
    });
    return { min, max, minIdx, maxIdx };
  }, [safeHistory]);

  if (safeHistory.length === 0) {
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

  const lastIdx = safeHistory.length - 1;
  const pad = Math.max(1, Math.round((minMax.max - minMax.min) * 0.04)) || 1;

  const shell = (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Portfolio value</p>
          <p className="text-[10px] text-muted-foreground/90 mt-0.5">
            {historyRangeLabel(range)} · synthetic path from current NAV
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as HistoryRange)}
            variant="outline"
            size="sm"
            className="flex-wrap justify-end"
            aria-label="Performance time range"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r} value={r} className="px-2.5 text-[10px] uppercase tracking-wide">
                {r}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span
            className={`text-xs font-medium tabular-nums shrink-0 ${changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            aria-label={`Period change ${changePct >= 0 ? "up" : "down"} ${Math.abs(changePct).toFixed(2)} percent`}
          >
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-[160px] sm:min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
          <AreaChart data={safeHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(204, 100%, 50%)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(204, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(220, 30%, 18%)" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(220, 20%, 55%)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              hide
              domain={[minMax.min - pad, minMax.max + pad]}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(220, 40%, 10%)",
                border: "1px solid hsl(220, 40%, 22%)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(228, 30%, 92%)" }}
              formatter={(v: number) => [`$${v.toLocaleString()}`, "NAV"]}
              labelFormatter={(l) => String(l)}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(204, 100%, 50%)"
              fill={`url(#${gradId})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            {minMax.minIdx !== lastIdx && (
              <ReferenceDot
                x={safeHistory[minMax.minIdx]?.label}
                y={minMax.min}
                r={3}
                fill="hsl(220, 25%, 45%)"
                stroke="none"
              />
            )}
            {minMax.maxIdx !== lastIdx && minMax.maxIdx !== minMax.minIdx && (
              <ReferenceDot
                x={safeHistory[minMax.maxIdx]?.label}
                y={minMax.max}
                r={3}
                fill="hsl(160, 45%, 45%)"
                stroke="none"
              />
            )}
            <ReferenceDot
              x={safeHistory[lastIdx]?.label}
              y={safeHistory[lastIdx]?.value}
              r={4}
              fill="hsl(204, 100%, 55%)"
              stroke="hsl(220, 40%, 8%)"
              strokeWidth={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col gap-3 h-full min-h-0">{shell}</div>;
  }

  return <div className="glass-card rounded-xl p-4 h-full flex flex-col min-h-0">{shell}</div>;
}
