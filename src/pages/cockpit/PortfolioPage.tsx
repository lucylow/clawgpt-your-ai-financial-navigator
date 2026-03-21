import { useMemo } from "react";
import { Download } from "lucide-react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { assetRoleForSymbol, assetRoleLabel } from "@/lib/economics/assetRoles";
import { estimateFeeRunwayMonths } from "@/lib/economics/executionCost";
import { computePortfolioAttribution } from "@/lib/portfolioAttribution";
import PortfolioChart from "@/components/cockpit/PortfolioChart";
import ChainHeatmap from "@/components/cockpit/ChainHeatmap";
import { Button } from "@/components/ui/button";
import { buildHoldingsCsv, buildPortfolioSnapshotJson, downloadTextFile } from "@/lib/exportReport";

export default function PortfolioPage() {
  const { totalValue, allocation, allocationByAsset, transactions } = usePortfolioStore();

  const economics = useMemo(() => {
    let usdt = 0;
    let xaut = 0;
    for (const row of Object.values(allocationByAsset)) {
      usdt += row?.USDt ?? 0;
      xaut += row?.XAUt ?? 0;
    }
    const usdtShare = totalValue > 0 ? usdt / totalValue : 0;
    const runway = estimateFeeRunwayMonths({ usdtLiquidUsd: usdt, expectedMonthlyFeesUsd: 45 });
    return { usdt, xaut, usdtShare, runway };
  }, [allocationByAsset, totalValue]);

  const attribution = useMemo(
    () => computePortfolioAttribution(allocation, allocationByAsset),
    [allocation, allocationByAsset],
  );

  const exportHoldingsCsv = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const body = buildHoldingsCsv(totalValue, allocation, allocationByAsset);
    downloadTextFile(`clawgpt-holdings-${stamp}.csv`, body);
  };

  const exportSnapshotJson = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const body = buildPortfolioSnapshotJson({
      exportedAt: new Date().toISOString(),
      totalValue,
      allocation,
      allocationByAsset,
      transactionCount: transactions.length,
    });
    downloadTextFile(`clawgpt-portfolio-${stamp}.json`, body, "application/json;charset=utf-8");
  };

  return (
    <div className="p-4 sm:p-6 overflow-y-auto h-full space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Portfolio overview</h1>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={exportHoldingsCsv}>
            <Download className="h-4 w-4" aria-hidden />
            Holdings CSV
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={exportSnapshotJson}>
            <Download className="h-4 w-4" aria-hidden />
            Snapshot JSON
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Economic roles</h2>
        <p className="text-xs text-muted-foreground mb-3">
          USD₮ is modeled as <strong className="text-foreground">liquidity / reserve</strong>. XAUt is a{" "}
          <strong className="text-foreground">hedge sleeve</strong> (gold exposure), not spendable cash.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-border/40 bg-background/30 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {assetRoleLabel(assetRoleForSymbol("USDt"))}
            </p>
            <p className="text-lg font-mono text-foreground">${economics.usdt.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">
              ~{(economics.usdtShare * 100).toFixed(1)}% of NAV
            </p>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/30 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {assetRoleLabel(assetRoleForSymbol("XAUt"))}
            </p>
            <p className="text-lg font-mono text-foreground">${economics.xaut.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Not a cash substitute</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-background/30 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Fee runway (USDt)</p>
            <p className="text-lg font-mono text-foreground">
              {Number.isFinite(economics.runway) ? `${economics.runway.toFixed(1)} mo` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">~$45/mo activity assumption (demo)</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">Attribution</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Chain-level contribution to <strong className="text-foreground">USDt</strong> vs{" "}
          <strong className="text-foreground">XAUt</strong> sleeves (not only total NAV share).
        </p>
        {attribution.concentrationFlags.length > 0 && (
          <p className="text-[11px] text-amber-200/90 mb-3 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1.5">
            Concentration: {attribution.concentrationFlags.join(", ")} each hold &gt;40% of total NAV.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground">
                <th className="text-left py-2 px-3">Chain</th>
                <th className="text-right py-2 px-3">% of USDt</th>
                <th className="text-right py-2 px-3">% of XAUt</th>
                <th className="text-right py-2 px-3">NAV share</th>
              </tr>
            </thead>
            <tbody>
              {attribution.byChain.map((row) => (
                <tr key={row.chain} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 capitalize text-foreground">{row.chain}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-foreground">
                    {(row.usdtShareOfAssetClass * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                    {(row.xautShareOfAssetClass * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">
                    {(row.shareOfNav * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Asset allocation</h2>
          <PortfolioChart embedded />
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
                <th className="text-right py-2 px-3">USDt (reserve)</th>
                <th className="text-right py-2 px-3">XAUt (hedge)</th>
                <th className="text-right py-2 px-3">Total</th>
                <th className="text-right py-2 px-3">Share</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(allocation).map(([chain, value]) => (
                <tr key={chain} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 capitalize text-foreground">{chain}</td>
                  <td className="py-2.5 px-3 text-right text-foreground font-mono">
                    ${(allocationByAsset[chain]?.USDt ?? 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground font-mono">
                    ${(allocationByAsset[chain]?.XAUt ?? 0).toLocaleString()}
                  </td>
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
