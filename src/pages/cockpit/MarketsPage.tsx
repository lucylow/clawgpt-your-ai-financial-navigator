import { TrendingDown, TrendingUp } from "lucide-react";

const ROWS = [
  { pair: "USD₮ / USD", price: "1.0000", ch24h: 0.01 },
  { pair: "XAUt / USD", price: "2,684.20", ch24h: 0.42 },
  { pair: "ETH / USD", price: "3,412.55", ch24h: -1.12 },
  { pair: "BTC / USD", price: "97,240.00", ch24h: 0.88 },
] as const;

export default function MarketsPage() {
  return (
    <div className="h-full space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Markets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reference snapshots for planning — not a trading venue. Connect data sources for live feeds where
          available.
        </p>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/40 bg-background/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Pair</th>
              <th className="px-4 py-3 font-medium">Last</th>
              <th className="px-4 py-3 font-medium text-right">24h</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const up = row.ch24h >= 0;
              return (
                <tr key={row.pair} className="border-b border-border/25 last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{row.pair}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">${row.price}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-xs ${
                        up ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {up ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
                      {up ? "+" : ""}
                      {row.ch24h.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
