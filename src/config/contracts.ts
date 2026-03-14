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
}

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    tokens: {
      USDt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      XAUt: "0x68749665FF8D2d112Fa859AA293F07A622782F38",
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
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    tokens: {
      USDt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      XAUt: "0x5530ec23f4ee152D72D8d6A5B5B9f130B2D7f9bF",
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
      USDt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      XAUt: "0x498Bf2B1e120FeD3Bd3fC42a4CbC916E8a212f4D",
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
  },
  solana: {
    name: "Solana",
    chainId: 101,
    tokens: {
      USDt: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      XAUt: "7dHbWXmci3dT8UFYWYZweBLjgyA8t8UjgNQwPc8hGj9V",
    },
    protocols: {},
  },
  tron: {
    name: "Tron",
    chainId: 728126428,
    tokens: {
      USDt: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      XAUt: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
    },
    protocols: {},
  },
};

// ABI fragments for common interactions
export const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

export const AAVE_LENDING_POOL_ABI = [
  "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function withdraw(address asset, uint256 amount, address to) returns (uint256)",
  "function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
];

export const UNISWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)",
];
