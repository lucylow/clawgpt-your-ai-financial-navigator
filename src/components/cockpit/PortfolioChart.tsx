import { usePortfolioStore } from "@/store/usePortfolioStore";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const mockHistory = [
  { time: "00:00", value: 12100 },
  { time: "04:00", value: 12250 },
  { time: "08:00", value: 12180 },
  { time: "12:00", value: 12450 },
  { time: "16:00", value: 12380 },
  { time: "20:00", value: 12620 },
  { time: "Now", value: 12760 },
];

export default function PortfolioChart() {
  return (
    <div className="glass-card rounded-xl p-4 h-full">
      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Portfolio Value (24h)</p>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={mockHistory}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
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
          />
          <Area type="monotone" dataKey="value" stroke="hsl(204, 100%, 50%)" fill="url(#grad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
