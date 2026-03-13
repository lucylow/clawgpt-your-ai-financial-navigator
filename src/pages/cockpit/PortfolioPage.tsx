import { usePortfolioStore } from "@/store/usePortfolioStore";
import PortfolioChart from "@/components/cockpit/PortfolioChart";
import ChainHeatmap from "@/components/cockpit/ChainHeatmap";

export default function PortfolioPage() {
  const { totalValue, allocation } = usePortfolioStore();

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Portfolio Overview</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Asset Allocation</h2>
          <PortfolioChart />
        </div>
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Chain Distribution</h2>
          <ChainHeatmap />
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Holdings by Chain</h2>
        <div className="text-xl font-bold text-foreground mb-4">
          Total: ${totalValue.toLocaleString()}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground">
                <th className="text-left py-2 px-3">Chain</th>
                <th className="text-right py-2 px-3">Balance (USDt)</th>
                <th className="text-right py-2 px-3">Share</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(allocation).map(([chain, value]) => (
                <tr key={chain} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 capitalize text-foreground">{chain}</td>
                  <td className="py-2.5 px-3 text-right text-foreground font-mono">
                    ${value.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">
                    {((value / totalValue) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
