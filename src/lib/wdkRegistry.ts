/**
 * WDK module registry — single source of truth for which `@tetherto/wdk-*` packages
 * back each chain in ClawGPT and what this build can safely do (read vs write).
 *
 * Official registration pattern: `new WDK(seed).registerWallet(chainKey, Module, config)` — see
 * https://docs.wdk.tether.io/sdk (Wallet Module Registration).
 *
 * Do not duplicate chain capability checks in UI vs walletClient; import helpers from here.
 */

import type { WdkChainId } from "@/config/chains";
import { SUPPORTED_WDK_CHAINS } from "@/config/chains";

/** Published npm names under @tetherto — keep aligned with package.json. */
export const WDK_PACKAGES = {
  core: "@tetherto/wdk",
  walletEvm: "@tetherto/wdk-wallet-evm",
  walletSolana: "@tetherto/wdk-wallet-solana",
  walletTron: "@tetherto/wdk-wallet-tron",
  walletTon: "@tetherto/wdk-wallet-ton",
} as const;

export type WdkWalletModuleKind = "evm" | "solana" | "tron" | "ton";

export type WdkTetherAsset = "USDt" | "XAUt";

export interface ChainWalletModuleMeta {
  /** First argument to `registerWallet` — must match `getAccount` / `getAccount(chain, 0)` keys. */
  registerKey: WdkChainId;
  moduleKind: WdkWalletModuleKind;
  /** Wallet package implementing this chain in this app. */
  packageName: string;
}

/**
 * Static mapping: ClawGPT chain → WDK wallet module package.
 * Specialized variants (e.g. ERC-4337, gasless) would appear as alternate entries when adopted.
 */
export const CHAIN_WALLET_REGISTRY: Record<WdkChainId, ChainWalletModuleMeta> = {
  ethereum: {
    registerKey: "ethereum",
    moduleKind: "evm",
    packageName: WDK_PACKAGES.walletEvm,
  },
  polygon: {
    registerKey: "polygon",
    moduleKind: "evm",
    packageName: WDK_PACKAGES.walletEvm,
  },
  arbitrum: {
    registerKey: "arbitrum",
    moduleKind: "evm",
    packageName: WDK_PACKAGES.walletEvm,
  },
  solana: {
    registerKey: "solana",
    moduleKind: "solana",
    packageName: WDK_PACKAGES.walletSolana,
  },
  tron: {
    registerKey: "tron",
    moduleKind: "tron",
    packageName: WDK_PACKAGES.walletTron,
  },
  ton: {
    registerKey: "ton",
    moduleKind: "ton",
    packageName: WDK_PACKAGES.walletTon,
  },
};

/** Runtime capabilities of this repository build (not every WDK module capability). */
export interface ChainRuntimeCapabilities {
  /** Fetch USDt / XAUt balances via ClawWdkBridge token paths. */
  tetherBalanceRead: boolean;
  /** User-initiated Tether token transfer implemented in `ClawWdkBridge.sendTetherTransfer`. */
  writeTransferUsdT: boolean;
  writeTransferXAUt: boolean;
  /** `simulateTetherEvmTransfer` wired for dry-run before sign. */
  evmTransferPreview: boolean;
}

export const CHAIN_RUNTIME_CAPS: Record<WdkChainId, ChainRuntimeCapabilities> = {
  ethereum: {
    tetherBalanceRead: true,
    writeTransferUsdT: true,
    writeTransferXAUt: true,
    evmTransferPreview: true,
  },
  polygon: {
    tetherBalanceRead: true,
    writeTransferUsdT: true,
    writeTransferXAUt: true,
    evmTransferPreview: true,
  },
  arbitrum: {
    tetherBalanceRead: true,
    writeTransferUsdT: true,
    writeTransferXAUt: true,
    evmTransferPreview: true,
  },
  solana: {
    tetherBalanceRead: true,
    writeTransferUsdT: false,
    writeTransferXAUt: false,
    evmTransferPreview: false,
  },
  tron: {
    tetherBalanceRead: true,
    writeTransferUsdT: false,
    writeTransferXAUt: false,
    evmTransferPreview: false,
  },
  ton: {
    tetherBalanceRead: true,
    writeTransferUsdT: false,
    writeTransferXAUt: false,
    evmTransferPreview: false,
  },
};

export function isWdkChainId(value: string): value is WdkChainId {
  return (SUPPORTED_WDK_CHAINS as readonly string[]).includes(value);
}

export function getChainWalletMeta(chain: WdkChainId): ChainWalletModuleMeta {
  return CHAIN_WALLET_REGISTRY[chain];
}

export function getRuntimeCapabilities(chain: WdkChainId): ChainRuntimeCapabilities {
  return CHAIN_RUNTIME_CAPS[chain];
}

export type TransferSupportResult =
  | { ok: true }
  | {
      ok: false;
      code: "CHAIN_UNSUPPORTED" | "CAPABILITY_UNSUPPORTED";
      message: string;
      chain: WdkChainId;
      packageName: string;
      asset: WdkTetherAsset;
    };

/**
 * Whether an automated Tether transfer is implemented for this chain/asset in the current build.
 * Use before calling `ClawWdkBridge.sendTetherTransfer` or surfacing “Confirm send” in UI.
 */
export function getTetherTransferSupport(chain: WdkChainId, asset: WdkTetherAsset): TransferSupportResult {
  const meta = CHAIN_WALLET_REGISTRY[chain];
  const caps = CHAIN_RUNTIME_CAPS[chain];
  if (!meta || !caps) {
    return {
      ok: false,
      code: "CHAIN_UNSUPPORTED",
      message: `Unknown chain: ${chain}`,
      chain,
      packageName: WDK_PACKAGES.core,
      asset,
    };
  }
  const allowed = asset === "USDt" ? caps.writeTransferUsdT : caps.writeTransferXAUt;
  if (!allowed) {
    return {
      ok: false,
      code: "CAPABILITY_UNSUPPORTED",
      message: `Tether ${asset} transfer is not wired for ${chain} in this build — see CHAIN_RUNTIME_CAPS and docs/WDK.md. Wallet reads use ${meta.packageName}.`,
      chain,
      packageName: meta.packageName,
      asset,
    };
  }
  return { ok: true };
}
