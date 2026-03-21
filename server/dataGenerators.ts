import type { DemoTransaction } from "./demoWalletState";

export function randomHex(length: number): string {
  const hex = Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return hex;
}

export function createMockTransaction(params: Partial<DemoTransaction> & Pick<DemoTransaction, "type">): DemoTransaction {
  return {
    hash: `0x${randomHex(64)}`,
    timestamp: Date.now(),
    gasUsed: Math.random() * 100000 + 21000,
    status: "pending",
    amount: 0,
    asset: "USDT",
    fromChain: "ethereum",
    toChain: "ethereum",
    toAddress: "0xself",
    ...params,
  };
}

export function mockNativeBalance(chain: string): number {
  void chain;
  return Math.round((Math.random() * 2 + 0.1) * 10000) / 10000;
}

export function calculateTotalValue(balances: Record<string, Record<string, number>>): number {
  let total = 0;
  for (const chain of Object.values(balances)) {
    for (const v of Object.values(chain)) {
      total += typeof v === "number" && Number.isFinite(v) ? v : 0;
    }
  }
  return Math.round(total * 100) / 100;
}

export function findHighestBalanceChain(balances: Record<string, Record<string, number>>): string {
  let best = "";
  let max = -1;
  for (const [chain, assets] of Object.entries(balances)) {
    const sum = Object.values(assets).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
    if (sum > max) {
      max = sum;
      best = chain;
    }
  }
  return best || "ethereum";
}
