import type { NestedAllocation, Transaction, WalletEntry } from "@/types";
import { DEMO_WALLET } from "@/lib/demoWallet";

/** Raw demo allocation — scaled to `MOCK_TOTAL_VALUE` in `getDemoPortfolioSnapshot`. */
export const MOCK_PORTFOLIO = {
  totalValue: 12456.78,
  allocation: {
    ethereum: { usdt: 5234.12, xaut: 0 },
    polygon: { usdt: 2891.45, xaut: 102.34 },
    arbitrum: { usdt: 2150.67 },
    solana: { usdt: 890.23 },
    tron: { usdt: 234.56 },
    ton: { usdt: 53.41 },
  },
  chains: ["ethereum", "polygon", "arbitrum", "solana", "tron", "ton"] as const,
};

function chainTotal(chain: { usdt: number; xaut?: number }): number {
  return chain.usdt + (chain.xaut ?? 0);
}

function rawChainTotals(): Record<string, number> {
  const a = MOCK_PORTFOLIO.allocation;
  return {
    ethereum: chainTotal(a.ethereum),
    polygon: chainTotal(a.polygon),
    arbitrum: chainTotal(a.arbitrum),
    solana: chainTotal(a.solana),
    tron: chainTotal(a.tron),
    ton: chainTotal(a.ton),
  };
}

/** 26+ realistic demo transactions (hashes are fake). */
export const MOCK_TRANSACTIONS: Transaction[] = [
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
];

const CHAINS = ["ethereum", "polygon", "arbitrum", "solana", "tron", "ton"] as const;

function randomHash(): string {
  const hex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `0xdemo${hex}`;
}

/** Synthetic tx for auto-demo ticker (deterministic shape). */
export function randomMockTransaction(): Transaction {
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

function demoWalletsFromAddresses(): WalletEntry[] {
  const entries = Object.entries(DEMO_WALLET.addresses);
  return entries.map(([chain, address], i) => ({
    id: `demo-${chain}-${i}`,
    chain,
    address: address.length > 18 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address,
    label: chain === "ethereum" ? "Primary" : DEMO_WALLET.label,
  }));
}

export function getDemoPortfolioSnapshot(): {
  totalValue: number;
  allocation: Record<string, number>;
  allocationByAsset: NestedAllocation;
  transactions: Transaction[];
  wallets: WalletEntry[];
} {
  const raw = rawChainTotals();
  const sumRaw = Object.values(raw).reduce((a, b) => a + b, 0);
  const target = MOCK_PORTFOLIO.totalValue;
  const scale = sumRaw > 0 ? target / sumRaw : 1;

  const allocation: Record<string, number> = {};
  for (const [chain, v] of Object.entries(raw)) {
    allocation[chain] = Math.round(v * scale * 100) / 100;
  }

  const a = MOCK_PORTFOLIO.allocation;
  const allocationByAsset: NestedAllocation = {
    ethereum: { USDt: Math.round(a.ethereum.usdt * scale * 100) / 100, XAUt: Math.round(a.ethereum.xaut * scale * 100) / 100 },
    polygon: { USDt: Math.round(a.polygon.usdt * scale * 100) / 100, XAUt: Math.round(a.polygon.xaut * scale * 100) / 100 },
    arbitrum: { USDt: Math.round(a.arbitrum.usdt * scale * 100) / 100 },
    solana: { USDt: Math.round(a.solana.usdt * scale * 100) / 100 },
    tron: { USDt: Math.round(a.tron.usdt * scale * 100) / 100 },
    ton: { USDt: Math.round(a.ton.usdt * scale * 100) / 100 },
  };

  return {
    totalValue: target,
    allocation,
    allocationByAsset,
    transactions: [...MOCK_TRANSACTIONS],
    wallets: demoWalletsFromAddresses(),
  };
}
