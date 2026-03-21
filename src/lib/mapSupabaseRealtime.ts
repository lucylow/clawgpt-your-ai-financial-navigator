import type { Tables } from "@/integrations/supabase/types";
import type { Transaction } from "@/types";

const TX_TYPES = new Set(["send", "receive", "swap", "bridge"]);
const TX_STATUS = new Set(["pending", "confirmed", "failed"]);

export function mapTransactionRow(row: Tables<"transactions">): Transaction {
  const hash = row.tx_hash?.trim() || `id:${row.id.slice(0, 8)}`;
  const assetRaw = (row.asset || "USDt").toUpperCase();
  const asset: Transaction["asset"] = assetRaw === "XAUt" ? "XAUt" : "USDt";
  const type = TX_TYPES.has(row.type) ? (row.type as Transaction["type"]) : "send";
  const status = TX_STATUS.has(row.status) ? (row.status as Transaction["status"]) : "pending";
  return {
    hash,
    type,
    amount: Number(row.amount),
    asset,
    fromChain: row.from_chain,
    toChain: row.to_chain,
    toAddress: row.to_address?.trim() ?? "",
    status,
    timestamp: new Date(row.created_at).getTime(),
  };
}
