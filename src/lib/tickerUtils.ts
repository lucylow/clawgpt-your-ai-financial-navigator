import type { TickerTransaction, TickerTxType, Transaction } from "@/types";

export function formatCompactAge(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem}s ago`;
  const h = Math.floor(m / 60);
  const mr = m % 60;
  return `${h}h ${mr}m ago`;
}

function hashToGasUsd(hash: string): string {
  let n = 0;
  for (let i = 0; i < hash.length; i++) n = (n + hash.charCodeAt(i) * (i + 1)) % 997;
  const v = (n % 900) / 100 + 0.5;
  return `$${v.toFixed(2)}`;
}

function mapPortfolioType(t: Transaction["type"]): TickerTxType {
  switch (t) {
    case "send":
      return "sent";
    case "receive":
      return "received";
    case "bridge":
      return "bridge";
    case "swap":
      return "swap";
    default:
      return "sent";
  }
}

function primaryChain(t: Transaction): string {
  if (t.type === "bridge" && t.fromChain !== t.toChain) return t.fromChain;
  return t.fromChain;
}

export function mapPortfolioTransaction(tx: Transaction, now = Date.now()): TickerTransaction {
  const type = mapPortfolioType(tx);
  const chain = primaryChain(tx);
  const chainTo =
    tx.type === "bridge" && tx.fromChain !== tx.toChain ? tx.toChain : undefined;

  return {
    id: `pf-${tx.hash}`,
    type,
    asset: tx.asset,
    amount: tx.amount,
    chain,
    chainTo,
    to: tx.toAddress,
    hash: tx.hash,
    gas: hashToGasUsd(tx.hash),
    status: tx.status === "failed" ? "failed" : tx.status === "pending" ? "pending" : "confirmed",
    timestamp: tx.timestamp,
    age: formatCompactAge(tx.timestamp, now),
  };
}

const DEMO_CHAINS = ["ethereum", "polygon", "arbitrum", "solana"] as const;
const DEMO_ASSETS = ["USDt", "XAUt"] as const;

export function mockTickerTransaction(): TickerTransaction {
  const chain = DEMO_CHAINS[Math.floor(Math.random() * DEMO_CHAINS.length)];
  const chainTo =
    Math.random() > 0.65 ? DEMO_CHAINS[Math.floor(Math.random() * DEMO_CHAINS.length)] : undefined;
  const asset = DEMO_ASSETS[Math.floor(Math.random() * DEMO_ASSETS.length)];
  const amount = Math.round((10 + Math.random() * 5000) * 1000) / 1000;
  const types: TickerTxType[] = ["sent", "received", "deposit", "bridge", "swap"];
  const type = types[Math.floor(Math.random() * types.length)];
  const ts = Date.now();
  const id = `demo-${crypto.randomUUID()}`;
  const hash = `0x${Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("")}…`;

  return {
    id,
    type,
    asset,
    amount,
    chain,
    chainTo: type === "bridge" && chainTo && chainTo !== chain ? chainTo : undefined,
    to: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
    hash,
    gas: hashToGasUsd(id),
    status: "pending",
    timestamp: ts,
    age: formatCompactAge(ts),
  };
}
