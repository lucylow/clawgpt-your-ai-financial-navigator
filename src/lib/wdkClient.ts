import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import WalletManagerSolana from "@tetherto/wdk-wallet-solana";
import WalletManagerTon from "@tetherto/wdk-wallet-ton";
import WalletManagerTron from "@tetherto/wdk-wallet-tron";
import type { NestedAllocation, Transaction, WalletEntry } from "@/types";
import {
  getEvmRpc,
  getEvmTokenAddresses,
  getSolanaMints,
  getSolanaRpc,
  getTonClientConfig,
  getTonJettonMasters,
  getTronRpc,
  getTronTokenAddresses,
  SUPPORTED_WDK_CHAINS,
  type WdkChainId,
} from "@/config/chains";
import { TETHER_DECIMALS } from "@/config/tetherAssets";
import { logChainExecution } from "@/lib/observability";

type EvmAccount = {
  getAddress: () => Promise<string>;
  getTokenBalances: (tokens: string[]) => Promise<unknown>;
  transfer: (o: { token: string; recipient: string; amount: bigint }) => Promise<{ hash: string }>;
};

function shortAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function shortHash(h: string): string {
  if (h.length <= 18) return h;
  return `${h.slice(0, 10)}…`;
}

function redactRecipient(addr: string): string {
  const t = addr.trim();
  if (t.length <= 14) return t;
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function fromTetherRawUnits(n: bigint, decimals: number): number {
  return Number(n) / 10 ** decimals;
}

function parseAssetAmount(amountStr: string, decimals = 6): bigint {
  const n = Number.parseFloat(amountStr);
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
  return BigInt(Math.round(n * 10 ** decimals));
}

/** Normalize unknown getTokenBalances return into two bigints (USDT, XAUT). */
function evmPairBalances(raw: unknown, len: number): [bigint, bigint] {
  if (Array.isArray(raw)) {
    const a = len > 0 ? BigInt(raw[0] as bigint | number | string) : 0n;
    const b = len > 1 ? BigInt(raw[1] as bigint | number | string) : 0n;
    return [a, b];
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, bigint>;
    const vals = Object.values(o);
    return [vals[0] ?? 0n, vals[1] ?? 0n];
  }
  return [0n, 0n];
}

export class ClawWdkBridge {
  private wdk: InstanceType<typeof WDK> | null = null;

  get instance(): InstanceType<typeof WDK> | null {
    return this.wdk;
  }

  isReady(): boolean {
    return this.wdk !== null;
  }

  connect(seedPhrase: string): void {
    const t0 = performance.now();
    logChainExecution({
      operation: "wdk.connect",
      phase: "start",
      detail: { phraseLen: seedPhrase?.length ?? 0 },
    });
    try {
      this.disconnect();
      const tonCfg = getTonClientConfig();
      this.wdk = new WDK(seedPhrase)
        .registerWallet("ethereum", WalletManagerEvm, { provider: getEvmRpc("ethereum") })
        .registerWallet("polygon", WalletManagerEvm, { provider: getEvmRpc("polygon") })
        .registerWallet("arbitrum", WalletManagerEvm, { provider: getEvmRpc("arbitrum") })
        .registerWallet("tron", WalletManagerTron, { provider: getTronRpc() })
        .registerWallet("solana", WalletManagerSolana, {
          rpcUrl: getSolanaRpc(),
          commitment: "confirmed",
        })
        .registerWallet("ton", WalletManagerTon, { tonClient: tonCfg });
      logChainExecution({
        operation: "wdk.connect",
        phase: "end",
        durationMs: Math.round(performance.now() - t0),
        ok: true,
      });
    } catch (e) {
      logChainExecution({
        operation: "wdk.connect",
        phase: "end",
        durationMs: Math.round(performance.now() - t0),
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  }

  disconnect(): void {
    logChainExecution({ operation: "wdk.disconnect", phase: "start" });
    try {
      this.wdk?.dispose();
    } catch {
      /* ignore */
    }
    this.wdk = null;
    logChainExecution({ operation: "wdk.disconnect", phase: "end", ok: true });
  }

  async getPrimaryAddress(): Promise<string> {
    if (!this.wdk) throw new Error("WDK not connected");
    const acc = await this.wdk.getAccount("ethereum", 0);
    return acc.getAddress();
  }

  async fetchBalances(chain: WdkChainId): Promise<{
    chain: string;
    address: string;
    timestamp: number;
    balances: Record<string, number>;
    nativeLabel: string;
  }> {
    if (!this.wdk) throw new Error("WDK not connected");
    const t0 = performance.now();
    logChainExecution({ operation: "wdk.fetch_balances", phase: "start", chain });
    try {
      return await this.fetchBalancesInner(chain);
    } finally {
      logChainExecution({
        operation: "wdk.fetch_balances",
        phase: "end",
        chain,
        durationMs: Math.round(performance.now() - t0),
        ok: true,
      });
    }
  }

  private async fetchBalancesInner(chain: WdkChainId): Promise<{
    chain: string;
    address: string;
    timestamp: number;
    balances: Record<string, number>;
    nativeLabel: string;
  }> {
    const acc = await this.wdk!.getAccount(chain, 0);
    const addr = await acc.getAddress();
    const balances: Record<string, number> = {};

    if (chain === "ethereum" || chain === "polygon" || chain === "arbitrum") {
      const tokens = getEvmTokenAddresses(chain);
      const evm = acc as unknown as EvmAccount;
      const addrs = [tokens.USDt, tokens.XAUt].filter((a) => a.startsWith("0x") && a.length === 42);
      if (addrs.length > 0) {
        try {
          const raw = await evm.getTokenBalances(addrs);
          const [u, x] = evmPairBalances(raw, addrs.length);
          if (tokens.USDt) balances.USDT = fromTetherRawUnits(u, TETHER_DECIMALS.USDt);
          if (tokens.XAUt) balances.XAUT = fromTetherRawUnits(x, TETHER_DECIMALS.XAUt);
        } catch {
          balances.USDT = 0;
          balances.XAUT = 0;
        }
      }
      return {
        chain,
        address: addr,
        timestamp: Date.now(),
        balances,
        nativeLabel: addr.startsWith("0x") ? "ETH" : "?",
      };
    }

    if (chain === "solana") {
      const mints = getSolanaMints();
      const anyAcc = acc as unknown as { getTokenBalance?: (m: string) => Promise<bigint> };
      try {
        if (mints.USDt && anyAcc.getTokenBalance)
          balances.USDT = fromTetherRawUnits(await anyAcc.getTokenBalance(mints.USDt), TETHER_DECIMALS.USDt);
      } catch {
        balances.USDT = 0;
      }
      try {
        if (mints.XAUt && anyAcc.getTokenBalance)
          balances.XAUT = fromTetherRawUnits(await anyAcc.getTokenBalance(mints.XAUt), TETHER_DECIMALS.XAUt);
      } catch {
        balances.XAUT = 0;
      }
      return { chain, address: addr, timestamp: Date.now(), balances, nativeLabel: "SOL" };
    }

    if (chain === "tron") {
      const t = getTronTokenAddresses();
      const anyAcc = acc as unknown as { getTokenBalance?: (m: string) => Promise<bigint> };
      try {
        if (t.USDt && anyAcc.getTokenBalance)
          balances.USDT = fromTetherRawUnits(await anyAcc.getTokenBalance(t.USDt), TETHER_DECIMALS.USDt);
      } catch {
        balances.USDT = 0;
      }
      try {
        if (t.XAUt && anyAcc.getTokenBalance)
          balances.XAUT = fromTetherRawUnits(await anyAcc.getTokenBalance(t.XAUt), TETHER_DECIMALS.XAUt);
      } catch {
        balances.XAUT = 0;
      }
      return { chain, address: addr, timestamp: Date.now(), balances, nativeLabel: "TRX" };
    }

    const jet = getTonJettonMasters();
    const anyAcc = acc as unknown as { getTokenBalance?: (m: string) => Promise<bigint> };
    try {
      if (jet.USDt && anyAcc.getTokenBalance)
        balances.USDT = fromTetherRawUnits(await anyAcc.getTokenBalance(jet.USDt), TETHER_DECIMALS.USDt);
    } catch {
      balances.USDT = 0;
    }
    try {
      if (jet.XAUt && anyAcc.getTokenBalance)
        balances.XAUT = fromTetherRawUnits(await anyAcc.getTokenBalance(jet.XAUt), TETHER_DECIMALS.XAUt);
    } catch {
      balances.XAUT = 0;
    }
    return { chain, address: addr, timestamp: Date.now(), balances, nativeLabel: "TON" };
  }

  async buildPortfolioSnapshot(): Promise<{
    totalValue: number;
    allocation: Record<string, number>;
    allocationByAsset: NestedAllocation;
    transactions: Transaction[];
    wallets: WalletEntry[];
  }> {
    if (!this.wdk) throw new Error("WDK not connected");
    const t0 = performance.now();
    logChainExecution({ operation: "wdk.portfolio_snapshot", phase: "start" });

    const allocation: Record<string, number> = {};
    const allocationByAsset: NestedAllocation = {};
    const wallets: WalletEntry[] = [];
    let total = 0;

    for (const chain of SUPPORTED_WDK_CHAINS) {
      try {
        const row = await this.fetchBalances(chain);
        wallets.push({
          id: `wdk-${chain}`,
          chain,
          address: shortAddress(row.address),
          label: chain === "ethereum" ? "Primary" : chain,
        });
        const usdt = row.balances.USDT ?? 0;
        const xaut = row.balances.XAUT ?? 0;
        const chainTotal = usdt + xaut;
        allocation[chain] = Math.round(chainTotal * 100) / 100;
        allocationByAsset[chain] = {
          USDt: Math.round(usdt * 100) / 100,
          XAUt: Math.round(xaut * 100) / 100,
        };
        total += chainTotal;
      } catch {
        wallets.push({
          id: `wdk-${chain}-err`,
          chain,
          address: "—",
          label: `${chain} (unavailable)`,
        });
        allocation[chain] = 0;
        allocationByAsset[chain] = { USDt: 0, XAUt: 0 };
      }
    }

    const totalValue = Math.round(total * 100) / 100;
    logChainExecution({
      operation: "wdk.portfolio_snapshot",
      phase: "snapshot",
      durationMs: Math.round(performance.now() - t0),
      ok: true,
      detail: {
        totalValue,
        chains: SUPPORTED_WDK_CHAINS.length,
      },
    });

    return {
      totalValue,
      allocation,
      allocationByAsset,
      transactions: [],
      wallets,
    };
  }

  async sendTetherTransfer(params: {
    chain: WdkChainId;
    to: string;
    amount: string;
    asset: "USDt" | "XAUt";
  }): Promise<{ hash: string; status: "pending" | "confirmed" }> {
    if (!this.wdk) throw new Error("WDK not connected");
    const { chain, to, amount, asset } = params;
    const t0 = performance.now();
    logChainExecution({
      operation: "wdk.transfer",
      phase: "start",
      chain,
      detail: { asset, to: redactRecipient(to) },
    });

    if (chain === "ethereum" || chain === "polygon" || chain === "arbitrum") {
      try {
        const tokens = getEvmTokenAddresses(chain);
        const token = asset === "USDt" ? tokens.USDt : tokens.XAUt;
        if (!token) throw new Error(`Set VITE token env for ${chain} ${asset}`);
        const acc = (await this.wdk.getAccount(chain, 0)) as unknown as EvmAccount;
        const amt = parseAssetAmount(amount, TETHER_DECIMALS[asset]);
        const res = await acc.transfer({ token, recipient: to, amount: amt });
        logChainExecution({
          operation: "wdk.transfer",
          phase: "end",
          chain,
          durationMs: Math.round(performance.now() - t0),
          ok: true,
          detail: { hash: shortHash(res.hash), asset },
        });
        return { hash: res.hash, status: "pending" };
      } catch (e) {
        logChainExecution({
          operation: "wdk.transfer",
          phase: "end",
          chain,
          durationMs: Math.round(performance.now() - t0),
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          detail: { asset },
        });
        throw e;
      }
    }

    const msg = `Automated ${asset} send for ${chain} is not configured in this build — use EVM testnets first.`;
    logChainExecution({
      operation: "wdk.transfer",
      phase: "end",
      chain,
      durationMs: Math.round(performance.now() - t0),
      ok: false,
      error: msg,
      detail: { asset },
    });
    throw new Error(msg);
  }
}

export const clawWdk = new ClawWdkBridge();
