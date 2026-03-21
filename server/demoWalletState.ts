import type { Transaction, WalletEntry } from "../src/types";
import { DEMO_WALLET } from "../src/lib/demoWallet";
import {
  calculateTotalValue,
  createMockTransaction,
  findHighestBalanceChain,
} from "./dataGenerators";

/** Multi-chain Tether-style assets (API layer). */
export const CHAINS = {
  ethereum: { id: "eth", symbol: "ETH", testnet: "sepolia" },
  polygon: { id: "polygon", symbol: "POLYGON", testnet: "mumbai" },
  arbitrum: { id: "arbitrum", symbol: "ARB", testnet: "arbitrum-goerli" },
  solana: { id: "solana", symbol: "SOL", testnet: "devnet" },
  tron: { id: "tron", symbol: "TRX", testnet: "shasta" },
  ton: { id: "ton", symbol: "TON", testnet: "testnet" },
} as const;

export type ChainKey = keyof typeof CHAINS;

export const TETHER_ASSETS = ["USDT", "XAUt", "USDT.e"] as const;

export type ApiAsset = (typeof TETHER_ASSETS)[number];

export interface DemoTransaction {
  hash: string;
  type: "send" | "receive" | "swap" | "bridge";
  amount: number;
  asset: ApiAsset;
  fromChain: string;
  toChain: string;
  toAddress: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
  gasUsed?: number;
}

export interface DemoWalletState {
  address: string;
  balances: Record<string, Record<string, number>>;
  transactions: DemoTransaction[];
}

const INITIAL_BALANCES: Record<string, Record<string, number>> = {
  ethereum: { USDT: 6120.4, XAUt: 0.22 },
  polygon: { USDT: 3012.9, "USDT.e": 500, XAUt: 118.6 },
  arbitrum: { USDT: 2288.55, XAUt: 0.08 },
  solana: { USDT: 1120.4, XAUt: 0.05 },
  tron: { USDT: 312.8 },
  ton: { USDT: 86.5 },
};

function deepCloneBalances(src: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [k, v] of Object.entries(src)) {
    out[k] = { ...v };
  }
  return out;
}

function seedTransactions(_address: string): DemoTransaction[] {
  const now = Date.now();
  return [
    createMockTransaction({
      type: "send",
      amount: 50,
      asset: "USDT",
      fromChain: "ethereum",
      toChain: "ethereum",
      toAddress: "0x3f2a91…",
      status: "confirmed",
      timestamp: now - 3600000,
    }),
    createMockTransaction({
      type: "receive",
      amount: 120,
      asset: "USDT",
      fromChain: "polygon",
      toChain: "polygon",
      toAddress: "0xself",
      status: "confirmed",
      timestamp: now - 7200000,
    }),
    createMockTransaction({
      type: "bridge",
      amount: 200,
      asset: "USDT",
      fromChain: "ethereum",
      toChain: "arbitrum",
      toAddress: "0xself",
      status: "confirmed",
      timestamp: now - 14400000,
    }),
    createMockTransaction({
      type: "bridge",
      amount: 300,
      asset: "USDT",
      fromChain: "polygon",
      toChain: "solana",
      toAddress: "9WzD…",
      status: "confirmed",
      timestamp: now - 26000000,
    }),
    createMockTransaction({
      type: "swap",
      amount: 500,
      asset: "USDT",
      fromChain: "solana",
      toChain: "solana",
      toAddress: "pool",
      status: "confirmed",
      timestamp: now - 21600000,
    }),
    createMockTransaction({
      type: "receive",
      amount: 1000,
      asset: "USDT",
      fromChain: "arbitrum",
      toChain: "arbitrum",
      toAddress: "0xself",
      status: "confirmed",
      timestamp: now - 42000000,
    }),
    createMockTransaction({
      type: "send",
      amount: 18.5,
      asset: "XAUt",
      fromChain: "ethereum",
      toChain: "ethereum",
      toAddress: "0xvault…",
      status: "confirmed",
      timestamp: now - 108500000,
    }),
    createMockTransaction({
      type: "bridge",
      amount: 95,
      asset: "USDT",
      fromChain: "tron",
      toChain: "ethereum",
      toAddress: "0xself",
      status: "pending",
      timestamp: now - 110000000,
    }),
    createMockTransaction({
      type: "swap",
      amount: 220,
      asset: "USDT",
      fromChain: "arbitrum",
      toChain: "arbitrum",
      toAddress: "0xcamelot…",
      status: "confirmed",
      timestamp: now - 112500000,
    }),
    createMockTransaction({
      type: "receive",
      amount: 2100,
      asset: "USDT",
      fromChain: "ethereum",
      toChain: "ethereum",
      toAddress: "0xself",
      status: "confirmed",
      timestamp: now - 124500000,
    }),
    createMockTransaction({
      type: "bridge",
      amount: 55,
      asset: "USDT",
      fromChain: "solana",
      toChain: "tron",
      toAddress: "Tbridge…",
      status: "failed",
      timestamp: now - 135000000,
    }),
    createMockTransaction({
      type: "send",
      amount: 125,
      asset: "USDT",
      fromChain: "ton",
      toChain: "ton",
      toAddress: "dedust…",
      status: "confirmed",
      timestamp: now - 131500000,
    }),
    createMockTransaction({
      type: "receive",
      amount: 450,
      asset: "USDT",
      fromChain: "arbitrum",
      toChain: "arbitrum",
      toAddress: "0xself",
      status: "confirmed",
      timestamp: now - 106000000,
    }),
    createMockTransaction({
      type: "send",
      amount: 500,
      asset: "USDT",
      fromChain: "ethereum",
      toChain: "ethereum",
      toAddress: "0xgnosis…",
      status: "confirmed",
      timestamp: now - 142000000,
    }),
  ];
}

/** In-memory demo wallet — single source of truth for API mocks. */
export let DEMO_WALLET_STATE: DemoWalletState = {
  address: DEMO_WALLET.addresses.ethereum,
  balances: deepCloneBalances(INITIAL_BALANCES),
  transactions: seedTransactions(DEMO_WALLET.addresses.ethereum),
};

export function initializeDemoWallet(): DemoWalletState {
  DEMO_WALLET_STATE = {
    address: DEMO_WALLET.addresses.ethereum,
    balances: deepCloneBalances(INITIAL_BALANCES),
    transactions: seedTransactions(DEMO_WALLET.addresses.ethereum),
  };
  return DEMO_WALLET_STATE;
}

/** Map API asset keys to frontend store keys (USDt / XAUt). */
export function apiAssetToStoreAsset(asset: string): "USDt" | "XAUt" {
  if (asset === "XAUt" || asset === "XAUt".toLowerCase()) return "XAUt";
  return "USDt";
}

function chainTotal(b: Record<string, number>): number {
  return Object.values(b).reduce((a, x) => a + (typeof x === "number" ? x : 0), 0);
}

function toNestedAllocation(
  balances: Record<string, Record<string, number>>
): Record<string, Record<string, number>> {
  const nested: Record<string, Record<string, number>> = {};
  for (const [chain, assets] of Object.entries(balances)) {
    nested[chain] = {};
    for (const [sym, val] of Object.entries(assets)) {
      const key = sym === "USDT" || sym === "USDT.e" ? "USDt" : sym === "XAUt" ? "XAUt" : sym;
      nested[chain][key] = (nested[chain][key] ?? 0) + val;
    }
  }
  return nested;
}

function toClientTransactions(txs: DemoTransaction[]): Transaction[] {
  return txs.map((t) => ({
    hash: t.hash,
    type: t.type,
    amount: t.amount,
    asset: apiAssetToStoreAsset(t.asset),
    fromChain: t.fromChain,
    toChain: t.toChain,
    toAddress: t.toAddress,
    status: t.status,
    timestamp: t.timestamp,
  }));
}

export function buildPortfolioSnapshot(): {
  totalValue: number;
  allocation: Record<string, number>;
  allocationByAsset: Record<string, Record<string, number>>;
  transactions: Transaction[];
  wallets: WalletEntry[];
} {
  const { balances, transactions } = DEMO_WALLET_STATE;
  const allocation: Record<string, number> = {};
  for (const [chain, b] of Object.entries(balances)) {
    allocation[chain] = Math.round(chainTotal(b) * 100) / 100;
  }
  const totalValue = calculateTotalValue(balances);
  const allocationByAsset = toNestedAllocation(balances);
  const entries = Object.entries(DEMO_WALLET.addresses);
  const wallets: WalletEntry[] = entries.map(([chain, address], i) => ({
    id: `demo-${chain}-${i}`,
    chain,
    address: address.length > 18 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address,
    label: chain === "ethereum" ? "Primary" : DEMO_WALLET.label,
  }));

  return {
    totalValue,
    allocation,
    allocationByAsset,
    transactions: toClientTransactions(transactions),
    wallets,
  };
}

export function getTotalValue(): number {
  return calculateTotalValue(DEMO_WALLET_STATE.balances);
}

export function getTopChain(): string {
  return findHighestBalanceChain(DEMO_WALLET_STATE.balances);
}
