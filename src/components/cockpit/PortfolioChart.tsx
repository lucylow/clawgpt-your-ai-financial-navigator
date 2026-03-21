import { useId, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { usePortfolioStore } from "@/store/usePortfolioStore";

export default function PortfolioChart() {
  const totalValue = usePortfolioStore((s) => s.totalValue);
  const gradId = useId().replace(/:/g, "");

  const history = useMemo(() => {
    const end = Number.isFinite(totalValue) && totalValue >= 0 ? totalValue : 0;
    const labels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "Now"] as const;
    const n = labels.length;
    const seed = Math.floor(end) % 1000;
    return labels.map((time, i) => {
      if (i === n - 1) return { time, value: Math.round(end) };
      const t = i / (n - 1);
      const wave = Math.sin(seed * 0.02 + i * 0.9) * 0.012;
      const value = Math.round(end * (0.94 + t * 0.06 + wave));
      return { time, value };
    });
  }, [totalValue]);

  const safeHistory = history.filter((point) => Number.isFinite(point.value));

  const changePct = useMemo(() => {
    if (safeHistory.length < 2) return 0;
    const first = safeHistory[0].value;
    const last = safeHistory[safeHistory.length - 1].value;
    if (!first) return 0;
    return ((last - first) / first) * 100;
  }, [safeHistory]);

  if (safeHistory.length === 0) {
    return (
      <div className="glass-card rounded-xl p-4 h-full flex items-center justify-center text-sm text-muted-foreground">
        No chart data available.
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Portfolio value (24h)</p>
          <p className="text-[10px] text-muted-foreground/90 mt-0.5">Synthetic path from current NAV</p>
        </div>
        <span
          className={`text-xs font-medium tabular-nums shrink-0 ${changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}
          aria-label={`24 hour change ${changePct >= 0 ? "up" : "down"} ${Math.abs(changePct).toFixed(2)} percent`}
        >
          {changePct >= 0 ? "+" : ""}
          {changePct.toFixed(2)}%
        </span>
      </div>
      <div className="flex-1 min-h-[140px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={140}>
          <AreaChart data={safeHistory}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(204, 100%, 50%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(204, 100%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(220, 20%, 55%)" }} axisLine={false} tickLine={false} />
            <YAxis hide domain={["dataMin - 200", "dataMax + 200"]} />
            <Tooltip
              contentStyle={{
                background: "hsl(220, 40%, 10%)",
                border: "1px solid hsl(220, 40%, 20%)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(228, 30%, 92%)" }}
              formatter={(v: number) => [`$${v.toLocaleString()}`, "Value"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(204, 100%, 50%)"
              fill={`url(#${gradId})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
