import type { AgentChainId } from "../lib/constants.js";

function env(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.trim().length > 0 ? v : fallback;
}

export function getEvmRpc(chain: "ethereum" | "polygon" | "arbitrum"): string {
  if (chain === "ethereum") return env("ETH_RPC_SEPOLIA", "https://sepolia.drpc.org");
  if (chain === "polygon") return env("POLYGON_RPC_AMOY", "https://rpc-amoy.polygon.technology");
  return env("ARBITRUM_RPC_SEPOLIA", "https://sepolia-rollup.arbitrum.io/rpc");
}

export function getTronRpc(): string {
  return env("TRON_RPC_SHASTA", "https://api.shasta.trongrid.io");
}

export function getSolanaRpc(): string {
  return env("SOLANA_RPC_DEVNET", "https://api.devnet.solana.com");
}

export function getTonClientConfig(): { url: string; secretKey?: string } {
  const url = env("TON_RPC_TESTNET", "https://testnet.toncenter.com/api/v2/jsonRPC");
  const secretKey = process.env.TONCENTER_API_KEY;
  return secretKey ? { url, secretKey } : { url };
}

export function getEvmTokenAddresses(chain: "ethereum" | "polygon" | "arbitrum"): {
  USDT: string;
  USAT: string;
  XAUT: string;
} {
  if (chain === "ethereum") {
    return {
      USDT: env("USDT_ETHEREUM_SEPOLIA", ""),
      USAT: env("USAt_ETHEREUM_SEPOLIA", ""),
      XAUT: env("XAUt_ETHEREUM_SEPOLIA", ""),
    };
  }
  if (chain === "polygon") {
    return {
      USDT: env("USDT_POLYGON_AMOY", ""),
      USAT: env("USAt_POLYGON_AMOY", ""),
      XAUT: env("XAUt_POLYGON_AMOY", ""),
    };
  }
  return {
    USDT: env("USDT_ARBITRUM_SEPOLIA", ""),
    USAT: env("USAt_ARBITRUM_SEPOLIA", ""),
    XAUT: env("XAUt_ARBITRUM_SEPOLIA", ""),
  };
}

export function getSolanaMints(): { USDT: string; USAT: string; XAUT: string } {
  return {
    USDT: env("USDT_SOLANA_DEVNET", ""),
    USAT: env("USAt_SOLANA_DEVNET", ""),
    XAUT: env("XAUt_SOLANA_DEVNET", ""),
  };
}

export function getTronTokenAddresses(): { USDT: string; USAT: string; XAUT: string } {
  return {
    USDT: env("USDT_TRON_SHASTA", ""),
    USAT: env("USAt_TRON_SHASTA", ""),
    XAUT: env("XAUt_TRON_SHASTA", ""),
  };
}

export function getTonJettonMasters(): { USDT: string; USAT: string; XAUT: string } {
  return {
    USDT: env("USDT_TON_TESTNET", ""),
    USAT: env("USAt_TON_TESTNET", ""),
    XAUT: env("XAUt_TON_TESTNET", ""),
  };
}

export function chainSupportsEvmTransfer(chain: AgentChainId): boolean {
  return chain === "ethereum" || chain === "polygon" || chain === "arbitrum";
}
