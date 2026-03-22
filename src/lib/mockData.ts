import type { NestedAllocation, Transaction, WalletEntry } from "@/types";
import { DEMO_WALLET } from "@/lib/demoWallet";

/** Authoritative sample allocation — scaled in `getSamplePortfolioSnapshot`. */
export const SAMPLE_PORTFOLIO = {
  totalValue: 14280.5,
  allocation: {
    ethereum: { usdt: 6120.4, xaut: 0.22 },
    polygon: { usdt: 3012.9, xaut: 118.6 },
    arbitrum: { usdt: 2288.55, xaut: 0.08 },
    solana: { usdt: 1120.4, xaut: 0.05 },
    tron: { usdt: 312.8 },
    ton: { usdt: 86.5 },
  },
  chains: ["ethereum", "polygon", "arbitrum", "solana", "tron", "ton"] as const,
};

function chainTotal(chain: { usdt: number; xaut?: number }): number {
  return chain.usdt + (chain.xaut ?? 0);
}

function rawChainTotals(): Record<string, number> {
  const a = SAMPLE_PORTFOLIO.allocation;
  return {
    ethereum: chainTotal(a.ethereum),
    polygon: chainTotal(a.polygon),
    arbitrum: chainTotal(a.arbitrum),
    solana: chainTotal(a.solana),
    tron: chainTotal(a.tron),
    ton: chainTotal(a.ton),
  };
}

/** 40+ realistic sample transactions for UI when chain history is unavailable. */
export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    hash: "0x3f2a91a1b2c3d4e5f6789012345678901234567890abcd",
    type: "send",
    amount: 50,
    asset: "USDt",
    fromChain: "ethereum",
    toChain: "ethereum",
    toAddress: "0x3f2a91…",
    status: "confirmed",
    timestamp: Date.now() - 3600000,
  },
  {
    hash: "0x7b8c12e2f3a4b5c6d78901234567890123456789012ef",
    type: "receive",
    amount: 120,
    asset: "USDt",
    fromChain: "polygon",
    toChain: "polygon",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 7200000,
  },
  {
    hash: "0xaa42ff33445566778899aabbccddeeff0011223344",
    type: "bridge",
    amount: 200,
    asset: "USDt",
    fromChain: "ethereum",
    toChain: "arbitrum",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 14400000,
  },
  {
    hash: "0xbb11cc2233445566778899aabbccddeeff0011223344",
    type: "send",
    amount: 25.5,
    asset: "USDt",
    fromChain: "arbitrum",
    toChain: "arbitrum",
    toAddress: "0x8a1f…",
    status: "confirmed",
    timestamp: Date.now() - 15000000,
  },
  {
    hash: "0xcc22dd33445566778899aabbccddeeff0011223344",
    type: "receive",
    amount: 0.12,
    asset: "XAUt",
    fromChain: "polygon",
    toChain: "polygon",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 18000000,
  },
  {
    hash: "0xdd33ee445566778899aabbccddeeff001122334455",
    type: "swap",
    amount: 500,
    asset: "USDt",
    fromChain: "solana",
    toChain: "solana",
    toAddress: "pool",
    status: "confirmed",
    timestamp: Date.now() - 21600000,
  },
  {
    hash: "0xee44ff5566778899aabbccddeeff00112233445566",
    type: "send",
    amount: 100,
    asset: "USDt",
    fromChain: "tron",
    toChain: "tron",
    toAddress: "T9yD…",
    status: "pending",
    timestamp: Date.now() - 22000000,
  },
  {
    hash: "0xff5566778899aabbccddeeff001122334455667788",
    type: "bridge",
    amount: 300,
    asset: "USDt",
    fromChain: "polygon",
    toChain: "solana",
    toAddress: "9WzD…",
    status: "confirmed",
    timestamp: Date.now() - 26000000,
  },
  {
    hash: "0x00112233445566778899aabbccddeeff0011223344",
    type: "receive",
    amount: 75,
    asset: "USDt",
    fromChain: "ethereum",
    toChain: "ethereum",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 30000000,
  },
  {
    hash: "0x112233445566778899aabbccddeeff001122334455",
    type: "send",
    amount: 12.34,
    asset: "XAUt",
    fromChain: "polygon",
    toChain: "polygon",
    toAddress: "0xdef…",
    status: "confirmed",
    timestamp: Date.now() - 34000000,
  },
  {
    hash: "0x2233445566778899aabbccddeeff00112233445566",
    type: "send",
    amount: 42,
    asset: "USDt",
    fromChain: "ton",
    toChain: "ton",
    toAddress: "EQB8…",
    status: "confirmed",
    timestamp: Date.now() - 38000000,
  },
  {
    hash: "0x33445566778899aabbccddeeff0011223344556677",
    type: "receive",
    amount: 1000,
    asset: "USDt",
    fromChain: "arbitrum",
    toChain: "arbitrum",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 42000000,
  },
  {
    hash: "0x445566778899aabbccddeeff001122334455667788",
    type: "bridge",
    amount: 150,
    asset: "USDt",
    fromChain: "ethereum",
    toChain: "polygon",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 46000000,
  },
  {
    hash: "0x5566778899aabbccddeeff00112233445566778899",
    type: "swap",
    amount: 80,
    asset: "XAUt",
    fromChain: "polygon",
    toChain: "polygon",
    toAddress: "0xamm…",
    status: "failed",
    timestamp: Date.now() - 50000000,
  },
  {
    hash: "0x66778899aabbccddeeff0011223344556677889900",
    type: "send",
    amount: 9.99,
    asset: "USDt",
    fromChain: "solana",
    toChain: "solana",
    toAddress: "9abc…",
    status: "confirmed",
    timestamp: Date.now() - 54000000,
  },
  {
    hash: "0x778899aabbccddeeff001122334455667788990011",
    type: "receive",
    amount: 250,
    asset: "USDt",
    fromChain: "tron",
    toChain: "tron",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 58000000,
  },
  {
    hash: "0x8899aabbccddeeff00112233445566778899001122",
    type: "bridge",
    amount: 600,
    asset: "USDt",
    fromChain: "arbitrum",
    toChain: "ethereum",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 62000000,
  },
  {
    hash: "0x99aabbccddeeff0011223344556677889900112233",
    type: "send",
    amount: 33,
    asset: "USDt",
    fromChain: "polygon",
    toChain: "polygon",
    toAddress: "0xpay…",
    status: "confirmed",
    timestamp: Date.now() - 66000000,
  },
  {
    hash: "0xaabbccddeeff001122334455667788990011223344",
    type: "receive",
    amount: 1.5,
    asset: "XAUt",
    fromChain: "arbitrum",
    toChain: "arbitrum",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 70000000,
  },
  {
    hash: "0xbbccddeeff00112233445566778899001122334455",
    type: "send",
    amount: 200,
    asset: "USDt",
    fromChain: "ethereum",
    toChain: "ethereum",
    toAddress: "0xaave…",
    status: "confirmed",
    timestamp: Date.now() - 74000000,
  },
  {
    hash: "0xccddeeff0011223344556677889900112233445566",
    type: "bridge",
    amount: 88,
    asset: "USDt",
    fromChain: "solana",
    toChain: "arbitrum",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 78000000,
  },
  {
    hash: "0xddeeff001122334455667788990011223344556677",
    type: "receive",
    amount: 15.75,
    asset: "USDt",
    fromChain: "ton",
    toChain: "ton",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 82000000,
  },
  {
    hash: "0xeeff00112233445566778899001122334455667788",
    type: "send",
    amount: 400,
    asset: "USDt",
    fromChain: "polygon",
    toChain: "arbitrum",
    toAddress: "0xself",
    status: "pending",
    timestamp: Date.now() - 86000000,
  },
  {
    hash: "0xff0011223344556677889900112233445566778899",
    type: "swap",
    amount: 50,
    asset: "USDt",
    fromChain: "ethereum",
    toChain: "ethereum",
    toAddress: "0xuni…",
    status: "confirmed",
    timestamp: Date.now() - 90000000,
  },
  {
    hash: "0x0011223344556677889900112233445566778899aa",
    type: "receive",
    amount: 5,
    asset: "XAUt",
    fromChain: "polygon",
    toChain: "polygon",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 94000000,
  },
  {
    hash: "0x11223344556677889900112233445566778899aabb",
    type: "send",
    amount: 17.2,
    asset: "USDt",
    fromChain: "tron",
    toChain: "tron",
    toAddress: "TJpay…",
    status: "confirmed",
    timestamp: Date.now() - 98000000,
  },
  {
    hash: "0x223344556677889900112233445566778899aabbcc",
    type: "bridge",
    amount: 1200,
    asset: "USDt",
    fromChain: "ethereum",
    toChain: "arbitrum",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 102000000,
  },
  {
    hash: "0x3344556677889900112233445566778899aabbccdd",
    type: "receive",
    amount: 450,
    asset: "USDt",
    fromChain: "arbitrum",
    toChain: "arbitrum",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 106000000,
  },
  {
    hash: "0x44556677889900112233445566778899aabbccddee",
    type: "send",
    amount: 18.5,
    asset: "XAUt",
    fromChain: "ethereum",
    toChain: "ethereum",
    toAddress: "0xvault…",
    status: "confirmed",
    timestamp: Date.now() - 108500000,
  },
  {
    hash: "0x556677889900112233445566778899aabbccddeeff",
    type: "bridge",
    amount: 95,
    asset: "USDt",
    fromChain: "tron",
    toChain: "ethereum",
    toAddress: "0xself",
    status: "pending",
    timestamp: Date.now() - 110000000,
  },
  {
    hash: "0x6677889900112233445566778899aabbccddeeff00",
    type: "swap",
    amount: 220,
    asset: "USDt",
    fromChain: "arbitrum",
    toChain: "arbitrum",
    toAddress: "0xcamelot…",
    status: "confirmed",
    timestamp: Date.now() - 112500000,
  },
  {
    hash: "0x77889900112233445566778899aabbccddeeff0011",
    type: "receive",
    amount: 0.08,
    asset: "XAUt",
    fromChain: "solana",
    toChain: "solana",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 115000000,
  },
  {
    hash: "0x889900112233445566778899aabbccddeeff001122",
    type: "send",
    amount: 64,
    asset: "USDt",
    fromChain: "polygon",
    toChain: "polygon",
    toAddress: "0xsub…",
    status: "confirmed",
    timestamp: Date.now() - 118000000,
  },
  {
    hash: "0x9900112233445566778899aabbccddeeff00112233",
    type: "bridge",
    amount: 340,
    asset: "USDt",
    fromChain: "arbitrum",
    toChain: "polygon",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 121000000,
  },
  {
    hash: "0xaa00112233445566778899aabbccddeeff0011223344",
    type: "receive",
    amount: 2100,
    asset: "USDt",
    fromChain: "ethereum",
    toChain: "ethereum",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 124500000,
  },
  {
    hash: "0xbb112233445566778899aabbccddeeff001122334455",
    type: "send",
    amount: 7.25,
    asset: "XAUt",
    fromChain: "polygon",
    toChain: "polygon",
    toAddress: "0xotc…",
    status: "confirmed",
    timestamp: Date.now() - 128000000,
  },
  {
    hash: "0xcc2233445566778899aabbccddeeff00112233445566",
    type: "swap",
    amount: 125,
    asset: "USDt",
    fromChain: "ton",
    toChain: "ton",
    toAddress: "dedust…",
    status: "confirmed",
    timestamp: Date.now() - 131500000,
  },
  {
    hash: "0xdd33445566778899aabbccddeeff0011223344556677",
    type: "bridge",
    amount: 55,
    asset: "USDt",
    fromChain: "solana",
    toChain: "tron",
    toAddress: "Tbridge…",
    status: "failed",
    timestamp: Date.now() - 135000000,
  },
  {
    hash: "0xee445566778899aabbccddeeff001122334455667788",
    type: "receive",
    amount: 48.9,
    asset: "USDt",
    fromChain: "ton",
    toChain: "ton",
    toAddress: "0xself",
    status: "confirmed",
    timestamp: Date.now() - 138500000,
  },
  {
    hash: "0xff5566778899aabbccddeeff00112233445566778899",
    type: "send",
    amount: 500,
    asset: "USDt",
    fromChain: "ethereum",
    toChain: "ethereum",
    toAddress: "0xgnosis…",
    status: "confirmed",
    timestamp: Date.now() - 142000000,
  },
];

const CHAINS = ["ethereum", "polygon", "arbitrum", "solana", "tron", "ton"] as const;

function randomHash(): string {
  const hex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `0x${hex}`;
}

/** Synthetic tx for activity ticker when live chain feed is unavailable. */
export function randomSampleTransaction(): Transaction {
  const fromChain = CHAINS[Math.floor(Math.random() * CHAINS.length)];
  let toChain = CHAINS[Math.floor(Math.random() * CHAINS.length)];
  if (Math.random() > 0.35) toChain = fromChain;
  const types: Transaction["type"][] = ["send", "receive", "bridge", "swap"];
  const type = types[Math.floor(Math.random() * types.length)];
  const asset: "USDt" | "XAUt" = Math.random() > 0.12 ? "USDt" : "XAUt";
  const amount = asset === "XAUt" ? Math.round((Math.random() * 0.5 + 0.01) * 1000) / 1000 : Math.round(Math.random() * 500 * 100) / 100;
  const toAddress =
    type === "receive" ? "0xself" : type === "swap" ? "0xpool…" : `${fromChain.slice(0, 4)}…`;
  return {
    hash: randomHash(),
    type,
    amount,
    asset,
    fromChain,
    toChain,
    toAddress,
    status: Math.random() > 0.08 ? "confirmed" : "pending",
    timestamp: Date.now(),
  };
}

function sampleWalletsFromAddresses(): WalletEntry[] {
  const entries = Object.entries(DEMO_WALLET.addresses);
  return entries.map(([chain, address], i) => ({
    id: `wc-${chain}-${i}`,
    chain,
    address: address.length > 18 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address,
    label: chain === "ethereum" ? "Primary" : DEMO_WALLET.label,
  }));
}

export function getSamplePortfolioSnapshot(): {
  totalValue: number;
  allocation: Record<string, number>;
  allocationByAsset: NestedAllocation;
  transactions: Transaction[];
  wallets: WalletEntry[];
} {
  const raw = rawChainTotals();
  const sumRaw = Object.values(raw).reduce((a, b) => a + b, 0);
  const target = SAMPLE_PORTFOLIO.totalValue;
  const scale = sumRaw > 0 ? target / sumRaw : 1;

  const allocation: Record<string, number> = {};
  for (const [chain, v] of Object.entries(raw)) {
    allocation[chain] = Math.round(v * scale * 100) / 100;
  }

  const a = SAMPLE_PORTFOLIO.allocation;
  const allocationByAsset: NestedAllocation = {
    ethereum: { USDt: Math.round(a.ethereum.usdt * scale * 100) / 100, XAUt: Math.round(a.ethereum.xaut * scale * 100) / 100 },
    polygon: { USDt: Math.round(a.polygon.usdt * scale * 100) / 100, XAUt: Math.round(a.polygon.xaut * scale * 100) / 100 },
    arbitrum: { USDt: Math.round(a.arbitrum.usdt * scale * 100) / 100, XAUt: Math.round((a.arbitrum.xaut ?? 0) * scale * 100) / 100 },
    solana: { USDt: Math.round(a.solana.usdt * scale * 100) / 100, XAUt: Math.round((a.solana.xaut ?? 0) * scale * 100) / 100 },
    tron: { USDt: Math.round(a.tron.usdt * scale * 100) / 100 },
    ton: { USDt: Math.round(a.ton.usdt * scale * 100) / 100 },
  };

  return {
    totalValue: target,
    allocation,
    allocationByAsset,
    transactions: [...SAMPLE_TRANSACTIONS],
    wallets: sampleWalletsFromAddresses(),
  };
}
