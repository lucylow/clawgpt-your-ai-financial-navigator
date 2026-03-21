import {
  ERC20_ABI,
  AAVE_LENDING_POOL_ABI,
  UNISWAP_ROUTER_ABI,
  ACCESS_NFT_ABI,
  DEMO_LENDING_POOL_ABI,
} from "../../contracts/abis/ethersFragments";
import { TETHER_MAINNET } from "./tetherAssets";

export {
  ERC20_ABI,
  AAVE_LENDING_POOL_ABI,
  UNISWAP_ROUTER_ABI,
  ACCESS_NFT_ABI,
  DEMO_LENDING_POOL_ABI,
};

export interface ChainConfig {
  name: string;
  chainId: number;
  tokens: {
    USDt: string;
    XAUt: string;
    WETH?: string;
  };
  protocols: {
    aave?: {
      lendingPool: string;
      dataProvider: string;
    };
    uniswap?: {
      router: string;
      factory: string;
    };
  };
  /** Optional deployed demo contracts (fill after deploy); EVM-only. */
  demo?: {
    accessNFT?: string;
    demoLendingPool?: string;
  };
}

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    tokens: {
      USDt: TETHER_MAINNET.ethereum.USDt,
      XAUt: TETHER_MAINNET.ethereum.XAUt,
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
    protocols: {
      aave: {
        lendingPool: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
        dataProvider: "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d",
      },
      uniswap: {
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    },
    demo: {},
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    tokens: {
      USDt: TETHER_MAINNET.polygon.USDt,
      XAUt: TETHER_MAINNET.polygon.XAUt,
      WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    },
    protocols: {
      aave: {
        lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        dataProvider: "0x7551b5D2763519d4e37e8B81929D336De671d46d",
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
    tokens: {
      USDt: TETHER_MAINNET.arbitrum.USDt,
      XAUt: TETHER_MAINNET.arbitrum.XAUt,
      WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    },
    protocols: {
      aave: {
        lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        dataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      },
      uniswap: {
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    },
    demo: {},
  },
  solana: {
    name: "Solana",
    chainId: 101,
    tokens: {
      USDt: TETHER_MAINNET.solana.USDt,
      XAUt: TETHER_MAINNET.solana.XAUt,
    },
    protocols: {},
  },
  tron: {
    name: "Tron",
    chainId: 728126428,
    tokens: {
      USDt: TETHER_MAINNET.tron.USDt,
      XAUt: TETHER_MAINNET.tron.XAUt,
    },
    protocols: {},
  },
  ton: {
    name: "TON",
    chainId: 0,
    tokens: {
      USDt: TETHER_MAINNET.ton.USDt,
      XAUt: TETHER_MAINNET.ton.XAUt,
    },
    protocols: {},
  },
};
