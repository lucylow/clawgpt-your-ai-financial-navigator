/**
 * JSON-RPC eth_call + eth_estimateGas for ERC-20 transfer — dry-run before WDK signs.
 * No extra deps: hex encoding only.
 */
import { getEvmRpc, getEvmTokenAddresses } from "@/config/chains";
import { TETHER_DECIMALS, type TetherAssetId } from "@/config/tetherAssets";

export type EvmSimulateTransferParams = {
  chain: "ethereum" | "polygon" | "arbitrum";
  token: string;
  from: `0x${string}` | string;
  to: `0x${string}` | string;
  /** Human-readable amount string (e.g. "12.5") */
  amount: string;
  decimals: number;
};

function normalizeHexAddr(addr: string): string {
  const t = addr.trim();
  if (!t.startsWith("0x") || t.length !== 42) throw new Error("Invalid EVM address");
  return t.toLowerCase();
}

function padAddrParam(addr: string): string {
  const h = normalizeHexAddr(addr).slice(2);
  return h.padStart(64, "0");
}

function padUint256(n: bigint): string {
  const h = n.toString(16);
  if (h.length > 64) throw new Error("Amount overflow");
  return h.padStart(64, "0");
}

/** ERC-20 transfer(address,uint256) */
export function encodeErc20Transfer(to: string, amountWei: bigint): `0x${string}` {
  const sel = "a9059cbb";
  return `0x${sel}${padAddrParam(to)}${padUint256(amountWei)}` as `0x${string}`;
}

function parseAmountToWei(amountStr: string, decimals: number): bigint {
  const n = Number.parseFloat(amountStr);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Invalid amount");
  return BigInt(Math.round(n * 10 ** decimals));
}

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const j = (await res.json()) as { result?: unknown; error?: { message?: string; data?: string } };
  if (j.error) {
    const msg = j.error.message ?? "RPC error";
    const err = new Error(msg) as Error & { data?: string };
    if (j.error.data) err.data = j.error.data;
    throw err;
  }
  return j.result;
}

export type EvmSimulationResult =
  | {
      ok: true;
      callSucceeded: boolean;
      gasEstimateHex: string;
      /** Gas units from eth_estimateGas (not wei). */
      gasUnits: bigint;
      /** Optional: network gas price wei (hex) */
      gasPriceWeiHex?: string;
    }
  | { ok: false; error: string; revertData?: string };

/**
 * Runs eth_call (transfer) then eth_estimateGas against the chain RPC.
 */
export async function simulateEvmErc20Transfer(p: EvmSimulateTransferParams): Promise<EvmSimulationResult> {
  const rpcUrl = getEvmRpc(p.chain);
  const token = normalizeHexAddr(p.token);
  const from = normalizeHexAddr(p.from as string) as `0x${string}`;
  const to = normalizeHexAddr(p.to as string);
  const amountWei = parseAmountToWei(p.amount, p.decimals);
  const data = encodeErc20Transfer(to, amountWei);

  try {
    await rpcCall(rpcUrl, "eth_call", [
      { from, to: token, data },
      "latest",
    ]);
  } catch (e) {
    const err = e as Error & { data?: string };
    return {
      ok: false,
      error: err.message || "eth_call reverted",
      revertData: err.data,
    };
  }

  let gasEstimateHex: string;
  try {
    gasEstimateHex = (await rpcCall(rpcUrl, "eth_estimateGas", [
      { from, to: token, data },
    ])) as string;
  } catch (e) {
    const err = e as Error & { data?: string };
    return {
      ok: false,
      error: err.message || "eth_estimateGas failed",
      revertData: err.data,
    };
  }

  let gasPriceWeiHex: string | undefined;
  try {
    gasPriceWeiHex = (await rpcCall(rpcUrl, "eth_gasPrice", [])) as string;
  } catch {
    gasPriceWeiHex = undefined;
  }

  const gasUnits = BigInt(gasEstimateHex);
  return {
    ok: true,
    callSucceeded: true,
    gasEstimateHex,
    gasUnits,
    gasPriceWeiHex,
  };
}

export function formatGasSummary(r: Extract<EvmSimulationResult, { ok: true }>): string {
  const parts = [`~${r.gasUnits.toString()} gas`];
  if (r.gasPriceWeiHex) {
    try {
      const gp = BigInt(r.gasPriceWeiHex);
      const fee = r.gasUnits * gp;
      const feeEth = Number(fee) / 1e18;
      if (Number.isFinite(feeEth) && feeEth > 0) {
        parts.push(`est. network fee ~${feeEth.toFixed(6)} native`);
      }
    } catch {
      /* ignore */
    }
  }
  return parts.join(" · ");
}

export async function simulateTetherEvmTransfer(
  chain: "ethereum" | "polygon" | "arbitrum",
  from: string,
  to: string,
  amount: string,
  asset: TetherAssetId,
): Promise<EvmSimulationResult> {
  const tokens = getEvmTokenAddresses(chain);
  const tokenAddr = asset === "XAUt" ? tokens.XAUt : tokens.USDt;
  if (!tokenAddr?.startsWith("0x")) {
    return { ok: false, error: `Set VITE_* token env for ${chain} ${asset} to simulate.` };
  }
  const decimals = TETHER_DECIMALS[asset];
  return simulateEvmErc20Transfer({
    chain,
    token: tokenAddr,
    from,
    to,
    amount,
    decimals,
  });
}
