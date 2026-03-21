import type { NestedAllocation, Transaction } from "@/types";

function escapeCsvCell(v: string): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildTransactionsCsv(rows: Transaction[]): string {
  const header = [
    "timestamp_iso",
    "type",
    "status",
    "asset",
    "amount",
    "from_chain",
    "to_chain",
    "to_address",
    "hash",
  ];
  const lines = rows.map((tx) => {
    const ts = new Date(tx.timestamp).toISOString();
    return [
      ts,
      tx.type,
      tx.status,
      tx.asset,
      String(tx.amount),
      tx.fromChain,
      tx.toChain,
      tx.toAddress,
      tx.hash,
    ]
      .map(escapeCsvCell)
      .join(",");
  });
  return [header.map(escapeCsvCell).join(","), ...lines].join("\n");
}

export function buildPortfolioSnapshotJson(payload: {
  exportedAt: string;
  totalValue: number;
  allocation: Record<string, number>;
  allocationByAsset: NestedAllocation;
  transactionCount?: number;
}): string {
  return JSON.stringify(payload, null, 2);
}

export function buildHoldingsCsv(
  totalValue: number,
  allocation: Record<string, number>,
  allocationByAsset: NestedAllocation,
): string {
  const header = ["chain", "usdt_usd", "xaut_usd", "total_usd", "share_pct"];
  const rows = Object.entries(allocation).map(([chain, value]) => {
    const usdt = allocationByAsset[chain]?.USDt ?? 0;
    const xaut = allocationByAsset[chain]?.XAUt ?? 0;
    const share = totalValue > 0 ? ((value / totalValue) * 100).toFixed(2) : "0";
    return [chain, String(usdt), String(xaut), String(value), share].map(escapeCsvCell).join(",");
  });
  return [header.map(escapeCsvCell).join(","), ...rows].join("\n");
}
