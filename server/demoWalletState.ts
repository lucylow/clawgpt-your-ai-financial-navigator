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
  ethereum: { USDT: 5234.12, XAUt: 0.023 },
  polygon: { USDT: 2891.45, "USDT.e": 500 },
  arbitrum: { USDT: 2150.67 },
  solana: { USDT: 890.23 },
  tron: { USDT: 234.56 },
  ton: { USDT: 53.41 },
};

function deepCloneBalances(src: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [k, v] of Object.entries(src)) {
    out[k] = { ...v };
  }
  return out;
}

function seedTransactions(address: string): DemoTransaction[] {
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
