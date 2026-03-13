import { usePortfolioStore } from "@/store/usePortfolioStore";

const chainColors: Record<string, string> = {
  ethereum: "bg-[#627EEA]",
  polygon: "bg-[#8247E5]",
  arbitrum: "bg-[#28A0F0]",
  solana: "bg-[#14F195]",
  tron: "bg-[#FF0013]",
  ton: "bg-[#0088CC]",
};

export default function ChainHeatmap() {
  const { allocation, totalValue } = usePortfolioStore();

  const sorted = Object.entries(allocation).sort((a, b) => b[1] - a[1]);

  return (
    <div className="glass-card rounded-xl p-4 h-full">
      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Chain Allocation</p>
      <div className="space-y-2">
        {sorted.map(([chain, value]) => {
          const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
          return (
            <div key={chain} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${chainColors[chain] || "bg-muted"}`} />
              <span className="text-xs capitalize flex-1 text-foreground">{chain}</span>
              <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
              <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${chainColors[chain] || "bg-primary"}`}
                  style={{ width: `${pct}%`, opacity: 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
