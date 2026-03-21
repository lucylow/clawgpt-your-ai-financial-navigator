/**
 * Testnet RPCs + optional Tether token contract/mint addresses for WDK balance + transfer calls.
 * Override via `.env.local` (Vite `VITE_*` vars).
 */

export const SUPPORTED_WDK_CHAINS = [
  "ethereum",
  "polygon",
  "arbitrum",
  "solana",
  "tron",
  "ton",
] as const;

export type WdkChainId = (typeof SUPPORTED_WDK_CHAINS)[number];

function env(key: string, fallback: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return v && v.trim().length > 0 ? v : fallback;
}

export function getEvmRpc(chain: "ethereum" | "polygon" | "arbitrum"): string {
  if (chain === "ethereum") {
    return env("VITE_ETH_RPC_SEPOLIA", "https://sepolia.drpc.org");
  }
  if (chain === "polygon") {
    return env("VITE_POLYGON_RPC_AMOY", "https://rpc-amoy.polygon.technology");
  }
  return env("VITE_ARBITRUM_RPC_SEPOLIA", "https://sepolia-rollup.arbitrum.io/rpc");
}

export function getTronRpc(): string {
  return env("VITE_TRON_RPC_SHASTA", "https://api.shasta.trongrid.io");
}

export function getSolanaRpc(): string {
  return env("VITE_SOLANA_RPC_DEVNET", "https://api.devnet.solana.com");
}

export function getTonClientConfig(): { url: string; secretKey?: string } {
  const url = env("VITE_TON_RPC_TESTNET", "https://testnet.toncenter.com/api/v2/jsonRPC");
  const secretKey = import.meta.env.VITE_TONCENTER_API_KEY as string | undefined;
  return secretKey ? { url, secretKey } : { url };
}

/** EVM ERC-20 token addresses (testnet). Set in env if you use different mocks. */
export function getEvmTokenAddresses(chain: "ethereum" | "polygon" | "arbitrum"): {
  USDt: string;
  XAUt: string;
} {
  if (chain === "ethereum") {
    return {
      USDt: env("VITE_USDT_ETHEREUM_SEPOLIA", ""),
      XAUt: env("VITE_XAUT_ETHEREUM_SEPOLIA", ""),
    };
  }
  if (chain === "polygon") {
    return {
      USDt: env("VITE_USDT_POLYGON_AMOY", ""),
      XAUt: env("VITE_XAUT_POLYGON_AMOY", ""),
    };
  }
  return {
    USDt: env("VITE_USDT_ARBITRUM_SEPOLIA", ""),
    XAUt: env("VITE_XAUT_ARBITRUM_SEPOLIA", ""),
  };
}

export function getSolanaMints(): { USDt: string; XAUt: string } {
  return {
    USDt: env("VITE_USDT_SOLANA_DEVNET", ""),
    XAUt: env("VITE_XAUT_SOLANA_DEVNET", ""),
  };
}

export function getTronTokenAddresses(): { USDt: string; XAUt: string } {
  return {
    USDt: env("VITE_USDT_TRON_SHASTA", ""),
    XAUt: env("VITE_XAUT_TRON_SHASTA", ""),
  };
}

export function getTonJettonMasters(): { USDt: string; XAUt: string } {
  return {
    USDt: env("VITE_USDT_TON_TESTNET", ""),
    XAUt: env("VITE_XAUT_TON_TESTNET", ""),
  };
}
