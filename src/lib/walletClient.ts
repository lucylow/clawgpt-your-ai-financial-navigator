/**
 * Wallet / Tether WDK boundary — all signing and chain RPC should go through here.
 *
 * TODO: Wire Tether WDK for Ethereum, Polygon, Arbitrum, etc.
 * TODO: Use session-based keys or browser extension; never store raw private keys in localStorage.
 * TODO: Production: hardware wallet / MPC / encrypted vault with user passphrase.
 */

export interface SendTransactionParams {
  chain: string;
  to: string;
  amount: string;
  asset: string;
  /** Optional memo for chains that support it */
  memo?: string;
}

export interface BalanceQuery {
  chain: string;
  address: string;
}

/** Create or restore a wallet context — stub returns a demo address only. */
export async function createWallet(): Promise<{ address: string; chain: string }> {
  // TODO: WDK createWallet / derive address
  return {
    address: "0x" + "demo".padStart(40, "0"),
    chain: "ethereum",
  };
}

export async function getBalances(
  queries: BalanceQuery[]
): Promise<Record<string, number>> {
  // TODO: WDK + RPC batch balances
  return Object.fromEntries(queries.map((q) => [`${q.chain}:${q.address}`, 0]));
}

export async function sendTransaction(
  _params: SendTransactionParams
): Promise<{ hash: string; status: "pending" | "confirmed" }> {
  // TODO: WDK sign + broadcast; return real tx hash
  return {
    hash: "0x" + Math.random().toString(16).slice(2) + "mock",
    status: "pending",
  };
}
