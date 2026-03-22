/**
 * WDK singleton factory — registers ETH, Polygon, Arbitrum (EVM), Solana, Tron, TON.
 * DeFi modules (Aave, Uniswap, Curve) are configured for testnet metadata in
 * `src/config/defiTestnet.ts`; on-chain calls use protocol-specific helpers in wallet service.
 */

import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import WalletManagerSolana from "@tetherto/wdk-wallet-solana";
import WalletManagerTon from "@tetherto/wdk-wallet-ton";
import WalletManagerTron from "@tetherto/wdk-wallet-tron";
import type { AgentChainId } from "../lib/constants.js";
import { SUPPORTED_CHAINS } from "../lib/constants.js";
import {
  getEvmRpc,
  getSolanaRpc,
  getTonClientConfig,
  getTronRpc,
} from "./chainsEnv.js";

export const CHAIN_WALLET_REGISTRY: Record<
  AgentChainId,
  { registerKey: AgentChainId; moduleKind: "evm" | "solana" | "tron" | "ton" }
> = {
  ethereum: { registerKey: "ethereum", moduleKind: "evm" },
  polygon: { registerKey: "polygon", moduleKind: "evm" },
  arbitrum: { registerKey: "arbitrum", moduleKind: "evm" },
  solana: { registerKey: "solana", moduleKind: "solana" },
  tron: { registerKey: "tron", moduleKind: "tron" },
  ton: { registerKey: "ton", moduleKind: "ton" },
};

export type WdkInstance = InstanceType<typeof WDK>;

/**
 * Build a fresh WDK instance from a BIP39 mnemonic and register all chain modules.
 * Call `dispose()` on the instance when done to release native handles.
 */
export function createWdkFromMnemonic(mnemonic: string): WdkInstance {
  const tonCfg = getTonClientConfig();
  let wdk: WdkInstance = new WDK(mnemonic);
  for (const chain of SUPPORTED_CHAINS) {
    const meta = CHAIN_WALLET_REGISTRY[chain];
    switch (meta.moduleKind) {
      case "evm":
        wdk = wdk.registerWallet(meta.registerKey, WalletManagerEvm, {
          provider: getEvmRpc(chain as "ethereum" | "polygon" | "arbitrum"),
        }) as WdkInstance;
        break;
      case "solana":
        wdk = wdk.registerWallet(meta.registerKey, WalletManagerSolana, {
          rpcUrl: getSolanaRpc(),
          commitment: "confirmed",
        }) as WdkInstance;
        break;
      case "tron":
        wdk = wdk.registerWallet(meta.registerKey, WalletManagerTron, {
          provider: getTronRpc(),
        }) as WdkInstance;
        break;
      case "ton":
        wdk = wdk.registerWallet(meta.registerKey, WalletManagerTon, {
          tonClient: tonCfg,
        }) as WdkInstance;
        break;
      default: {
        const _ex: never = meta.moduleKind;
        throw new Error(`Unhandled module: ${_ex}`);
      }
    }
  }
  return wdk;
}
