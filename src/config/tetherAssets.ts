/**
 * Official mainnet contract / mint addresses for Tether USD₮ and XAU₮ (Tether Gold).
 * Used as reference defaults in CHAIN_CONFIGS; WDK testnet flows override via `VITE_*` in chains.ts.
 *
 * Sources: Tether transparency / block explorers (EVM), SPL mint registry (Solana), TON jetton masters.
 */

export type TetherAssetId = "USDt" | "XAUt";

export type TetherChainKey =
  | "ethereum"
  | "polygon"
  | "arbitrum"
  | "solana"
  | "tron"
  | "ton";

/** Per-chain mainnet addresses for the two flagship Tether assets. */
export const TETHER_MAINNET: Record<
  TetherChainKey,
  { USDt: string; XAUt: string }
> = {
  ethereum: {
    USDt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    XAUt: "0x68749665FF8D2d112Fa859AA293F07A622782F38",
  },
  polygon: {
    USDt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    XAUt: "0x5530ec23f4ee152D72D8d6A5B5B9f130B2D7f9bF",
  },
  arbitrum: {
    USDt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    XAUt: "0x498Bf2B1e120FeD3Bd3fC42a4CbC916E8a212f4D",
  },
  solana: {
    USDt: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    /** Tether Gold (XAUt0) SPL — not stSOL; previous value was incorrect. */
    XAUt: "AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P",
  },
  tron: {
    USDt: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    XAUt: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
  },
  ton: {
    USDt: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    /** XAUt0 jetton master (Tether Gold on TON). */
    XAUt: "EQA1R_LuQCLHlMgOo1S4G7Y7W1cd0FrAkbA10Zq7rddKxi9k",
  },
};

/** Default ERC-20 / SPL decimals for these products (EVM + Solana Tether deployments use 6). */
export const TETHER_DECIMALS: Record<TetherAssetId, number> = {
  USDt: 6,
  XAUt: 6,
};
