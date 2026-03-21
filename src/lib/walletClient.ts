/**
 * Wallet boundary — Tether WDK behind a stable facade. UI and stores call these helpers;
 * swap implementations here without changing component trees.
 *
 * WDK packages are loaded asynchronously so the public landing route does not evaluate
 * heavy native/crypto stacks (avoids blank pages on Lovable and similar previews).
 */
import type { WdkChainId } from "@/config/chains";
import { SUPPORTED_WDK_CHAINS } from "@/config/chains";
import { DEMO_SESSION_KEY, WALLET_MODE_KEY, WDK_SEED_SESSION_KEY } from "@/lib/demoWallet";
import type { UserConfirmedChainIntent } from "@/lib/securityModel";
import { getQueryClient } from "@/lib/queryClientSingleton";
import { queryKeys } from "@/lib/queryKeys";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { logChainExecution } from "@/lib/observability";

type WdkModule = typeof import("@/lib/wdkClient");

let wdkModulePromise: Promise<WdkModule> | null = null;
let wdkModuleCache: WdkModule | null = null;

async function loadWdkModule(): Promise<WdkModule> {
  if (wdkModuleCache) return wdkModuleCache;
  if (!wdkModulePromise) {
    wdkModulePromise = import("@/lib/wdkClient")
      .then((m) => {
        wdkModuleCache = m;
        return m;
      })
      .catch((e) => {
        wdkModulePromise = null;
        const detail = e instanceof Error ? e.message : String(e);
        throw new Error(`Wallet SDK failed to load: ${detail}`);
      });
  }
  return wdkModulePromise;
}

export interface SendTransactionParams {
  chain: string;
  to: string;
  amount: string;
  asset: string;
  memo?: string;
}

export interface BalanceQuery {
  chain: string;
  address: string;
}

export type ConnectDemoWalletResult = {
  success: boolean;
  wallet?: {
    address: string;
    chains: string[];
    status: "connected" | "error";
  };
  mnemonic?: string;
  error?: string;
};

function readWalletMode(): "wdk" | "demo" {
  try {
    return sessionStorage.getItem(WALLET_MODE_KEY) === "wdk" ? "wdk" : "demo";
  } catch {
    return "demo";
  }
}

export function getWalletMode(): "wdk" | "demo" {
  return readWalletMode();
}

export function isRealWdkSession(): boolean {
  if (readWalletMode() !== "wdk") return false;
  return wdkModuleCache?.clawWdk.isReady() ?? false;
}

export function disconnectWalletSession(): void {
  if (wdkModuleCache) {
    wdkModuleCache.clawWdk.disconnect();
  } else if (wdkModulePromise) {
    void wdkModulePromise.then((m) => m.clawWdk.disconnect());
  }
  try {
    sessionStorage.removeItem(WDK_SEED_SESSION_KEY);
    sessionStorage.removeItem(WALLET_MODE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Same entry point name as the old demo helper — now wires a real WDK session when `VITE_USE_WDK` is enabled.
 */
export async function connectDemoWallet(seedOverride?: string): Promise<ConnectDemoWalletResult> {
  if (import.meta.env.VITE_USE_WDK === "false") {
    return { success: false, error: "WDK disabled (VITE_USE_WDK=false)" };
  }
  const t0 = performance.now();
  logChainExecution({ operation: "wallet.session_connect", phase: "start" });
  try {
    const [{ clawWdk }, { default: WDK }] = await Promise.all([loadWdkModule(), import("@tetherto/wdk")]);
    const phrase =
      seedOverride ??
      (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(WDK_SEED_SESSION_KEY) : null) ??
      WDK.getRandomSeedPhrase();
    clawWdk.connect(phrase);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(WDK_SEED_SESSION_KEY, phrase);
      sessionStorage.setItem(WALLET_MODE_KEY, "wdk");
    }
    const primary = await clawWdk.getPrimaryAddress();
    return {
      success: true,
      mnemonic: phrase,
      wallet: {
        address: primary,
        chains: [...SUPPORTED_WDK_CHAINS],
        status: "connected",
      },
    };
  } catch (e) {
    disconnectWalletSession();
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      wallet: { address: "", chains: [], status: "error" },
    };
  }
}

export async function refreshLivePortfolio(): Promise<void> {
  if (readWalletMode() !== "wdk") return;
  const { clawWdk } = await loadWdkModule();
  if (!clawWdk.isReady()) return;
  const t0 = performance.now();
  logChainExecution({ operation: "wallet.refresh_portfolio", phase: "start" });
  try {
    const snap = await clawWdk.buildPortfolioSnapshot();
    usePortfolioStore.getState().hydrateDemoPortfolio(snap);
    usePortfolioStore.getState().setPortfolioSyncError(null);
    getQueryClient()?.invalidateQueries({ queryKey: queryKeys.portfolio.all });
    logChainExecution({
      operation: "wallet.refresh_portfolio",
      phase: "end",
      durationMs: Math.round(performance.now() - t0),
      ok: true,
      detail: { totalValue: snap.totalValue },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Portfolio sync failed";
    logChainExecution({
      operation: "wallet.refresh_portfolio",
      phase: "end",
      durationMs: Math.round(performance.now() - t0),
      ok: false,
      error: msg,
    });
    usePortfolioStore.getState().setPortfolioSyncError(msg);
    throw new Error(msg);
  }
}

export async function createWallet(): Promise<{ address: string; chain: string }> {
  try {
    const { clawWdk } = await loadWdkModule();
    if (clawWdk.isReady()) {
      const address = await clawWdk.getPrimaryAddress();
      return { address, chain: "ethereum" };
    }
  } catch {
    /* fallback when WDK is unavailable or not ready */
  }
  return {
    address: "0x" + "demo".padStart(40, "0"),
    chain: "ethereum",
  };
}

export async function getBalances(queries: BalanceQuery[]): Promise<Record<string, number>> {
  const { clawWdk } = await loadWdkModule();
  if (!clawWdk.isReady()) {
    return Object.fromEntries(queries.map((q) => [`${q.chain}:${q.address}`, 0]));
  }
  const out: Record<string, number> = {};
  for (const q of queries) {
    try {
      const row = await clawWdk.fetchBalances(q.chain as WdkChainId);
      const sum = (row.balances.USDT ?? 0) + (row.balances.XAUT ?? 0);
      out[`${q.chain}:${q.address}`] = sum;
    } catch {
      out[`${q.chain}:${q.address}`] = 0;
    }
  }
  return out;
}

export type SendTransactionResult =
  | { ok: true; hash: string; status: "pending" | "confirmed" }
  | {
      ok: false;
      error: string;
      code: "WALLET_NOT_READY" | "VALIDATION" | "CHAIN_UNSUPPORTED" | "EXECUTION";
    };

export async function sendTransaction(
  params: SendTransactionParams,
  intent: UserConfirmedChainIntent,
): Promise<SendTransactionResult> {
  if (
    intent.kind !== "user_confirmed" ||
    typeof intent.confirmedAtMs !== "number" ||
    !Number.isFinite(intent.confirmedAtMs)
  ) {
    logChainExecution({
      operation: "wallet.send_transaction",
      phase: "end",
      ok: false,
      error: "missing_user_intent",
      detail: { code: "VALIDATION" },
    });
    return {
      ok: false,
      error: "On-chain sends require an explicit user confirmation intent.",
      code: "VALIDATION",
    };
  }
  if (!(SUPPORTED_WDK_CHAINS as readonly string[]).includes(params.chain)) {
    logChainExecution({
      operation: "wallet.send_transaction",
      phase: "end",
      chain: params.chain,
      ok: false,
      error: "unsupported_chain",
      detail: { code: "VALIDATION" },
    });
    return { ok: false, error: `Unsupported chain: ${params.chain}`, code: "VALIDATION" };
  }
  const chain = params.chain as WdkChainId;
  if (!params.to?.trim()) {
    logChainExecution({
      operation: "wallet.send_transaction",
      phase: "end",
      chain,
      ok: false,
      error: "missing_recipient",
      detail: { code: "VALIDATION" },
    });
    return { ok: false, error: "Recipient address is required.", code: "VALIDATION" };
  }
  const amt = Number.parseFloat(params.amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    logChainExecution({
      operation: "wallet.send_transaction",
      phase: "end",
      chain,
      ok: false,
      error: "invalid_amount",
      detail: { code: "VALIDATION" },
    });
    return { ok: false, error: "Invalid amount.", code: "VALIDATION" };
  }
  const { clawWdk } = await loadWdkModule();
  if (!clawWdk.isReady()) {
    logChainExecution({
      operation: "wallet.send_transaction",
      phase: "end",
      chain,
      ok: false,
      error: "wallet_not_ready",
      detail: { code: "WALLET_NOT_READY" },
    });
    return {
      ok: false,
      error: "Wallet not connected. Connect WDK from the cockpit wallet control.",
      code: "WALLET_NOT_READY",
    };
  }
  if (chain !== "ethereum" && chain !== "polygon" && chain !== "arbitrum") {
    logChainExecution({
      operation: "wallet.send_transaction",
      phase: "end",
      chain,
      ok: false,
      error: "chain_unsupported",
      detail: { code: "CHAIN_UNSUPPORTED" },
    });
    return {
      ok: false,
      error: `On-chain ${params.asset} transfer for ${chain} is not wired in this build (EVM testnets only).`,
      code: "CHAIN_UNSUPPORTED",
    };
  }
  logChainExecution({
    operation: "wallet.send_transaction",
    phase: "start",
    chain,
    detail: { asset: params.asset },
  });
  try {
    const asset = params.asset === "XAUt" ? "XAUt" : "USDt";
    const r = await clawWdk.sendTetherTransfer({
      chain,
      to: params.to.trim(),
      amount: params.amount,
      asset,
    });
    logChainExecution({
      operation: "wallet.send_transaction",
      phase: "end",
      chain,
      ok: true,
      detail: { hash: r.hash.length > 14 ? `${r.hash.slice(0, 10)}…` : r.hash },
    });
    return { ok: true, hash: r.hash, status: r.status };
  } catch (e) {
    logChainExecution({
      operation: "wallet.send_transaction",
      phase: "end",
      chain,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      detail: { code: "EXECUTION" },
    });
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      code: "EXECUTION",
    };
  }
}

/** @deprecated Use connectDemoWallet — name kept for docs / search */
export const connectRealWallet = connectDemoWallet;

/** After reload: reconnect WDK + refresh portfolio when a real session was active. */
export async function restoreSessionIfNeeded(): Promise<void> {
  if (import.meta.env.VITE_USE_WDK === "false") return;
  try {
    const connected =
      typeof localStorage !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "1";
    const seed =
      typeof sessionStorage !== "undefined" ? sessionStorage.getItem(WDK_SEED_SESSION_KEY) : null;
    const mode =
      typeof sessionStorage !== "undefined" ? sessionStorage.getItem(WALLET_MODE_KEY) : null;
    if (!connected || mode !== "wdk" || !seed) return;
    const r = await connectDemoWallet(seed);
    if (!r.success) {
      const msg = r.error?.trim()
        ? `Session restore: ${r.error}`
        : "Could not restore wallet session after reload.";
      usePortfolioStore.getState().setPortfolioSyncError(msg);
      return;
    }
    await refreshLivePortfolio();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Session restore failed.";
    usePortfolioStore.getState().setPortfolioSyncError(msg);
  }
}
