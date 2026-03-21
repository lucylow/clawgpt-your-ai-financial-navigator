import type { ChainConfig, RouteMeta } from "./types.ts";

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    gasAvgUsd: 3.5,
    tokens: {
      USDt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      XAUt: "0x68749665FF8D2d112Fa859AA293F07A622782F38",
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
    protocols: {
      aave: {
        lendingPool: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
        dataProvider: "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d",
        avgApy: 3.8,
      },
      uniswap: {
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    },
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    gasAvgUsd: 0.03,
    tokens: {
      USDt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      XAUt: "0x5530ec23f4ee152D72D8d6A5B5B9f130B2D7f9bF",
      WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    },
    protocols: {
      aave: {
        lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        dataProvider: "0x7551b5D2763519d4e37e8B81929D336De671d46d",
        avgApy: 4.2,
      },
      uniswap: {
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    },
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    gasAvgUsd: 0.15,
    tokens: {
      USDt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      XAUt: "0x498Bf2B1e120FeD3Bd3fC42a4CbC916E8a212f4D",
      WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    },
    protocols: {
      aave: {
        lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        dataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
        avgApy: 4.5,
      },
      uniswap: {
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    },
  },
  solana: {
    name: "Solana",
    chainId: 101,
    gasAvgUsd: 0.002,
    tokens: {
      USDt: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      XAUt: "AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P",
    },
    protocols: {},
  },
  tron: {
    name: "Tron",
    chainId: 728126428,
    gasAvgUsd: 1.1,
    tokens: {
      USDt: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      XAUt: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
    },
    protocols: {},
  },
  ton: {
    name: "TON",
    chainId: 0,
    gasAvgUsd: 0.05,
    tokens: {
      USDt: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
      XAUt: "EQA1R_LuQCLHlMgOo1S4G7Y7W1cd0FrAkbA10Zq7rddKxi9k",
    },
    protocols: {},
  },
};

export const SUPPORTED_CHAIN_KEYS = Object.keys(CHAIN_CONFIGS);

export function chainPairKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

const ROUTE_META_BY_PAIR: Record<string, RouteMeta> = {
  [chainPairKey("ethereum", "arbitrum")]: {
    label: "Canonical rollup bridge",
    etaHours: "~12–24h (challenge window on full exit)",
    relayUsd: 2.5,
    hops: 1,
    notes: "High L1 gas on deposit; cheap L2 execution after.",
  },
  [chainPairKey("ethereum", "polygon")]: {
    label: "PoS bridge / official",
    etaHours: "~20–60m typical",
    relayUsd: 1.8,
    hops: 1,
    notes: "Popular path; check token mapping for USDt.",
  },
  [chainPairKey("polygon", "arbitrum")]: {
    label: "L2 ↔ L2 (via Ethereum or liquidity route)",
    etaHours: "~30m–3h",
    relayUsd: 3.2,
    hops: 2,
    notes: "Often routed through Ethereum L1 or shared liquidity; compare fees.",
  },
};

const ROUTE_META_FALLBACK: RouteMeta = {
  label: "Generic bridge path",
  etaHours: "~20m–24h (route-dependent)",
  relayUsd: 3.0,
  hops: 2,
  notes: "Compare estimates below; always verify token contracts and bridge UI.",
};

export function getRouteMeta(from: string, to: string): RouteMeta {
  return ROUTE_META_BY_PAIR[chainPairKey(from, to)] ?? ROUTE_META_FALLBACK;
}
