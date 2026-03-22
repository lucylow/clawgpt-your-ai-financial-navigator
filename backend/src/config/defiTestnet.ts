/**
 * Testnet DeFi metadata — APY hints and gas estimates for yield ranking.
 * Replace with live oracle / RPC reads when wiring protocol SDKs.
 */

import type { AgentChainId } from "../lib/constants.js";

export type DefiOpportunity = {
  chain: AgentChainId;
  protocol: "aave" | "uniswap_v3" | "curve";
  pool: string;
  asset: "USDT" | "XAUT";
  grossApyPct: number;
  estGasUsd: number;
  netApyAfterGasPct: number;
};

const GAS_ETH_L2 = 0.15;
const GAS_ETH_L1 = 2.5;
const GAS_SOL = 0.02;
const GAS_TRON = 0.05;
const GAS_TON = 0.08;

function gasForChain(chain: AgentChainId): number {
  switch (chain) {
    case "ethereum":
      return GAS_ETH_L1;
    case "arbitrum":
    case "polygon":
      return GAS_ETH_L2;
    case "solana":
      return GAS_SOL;
    case "tron":
      return GAS_TRON;
    case "ton":
      return GAS_TON;
    default:
      return 1;
  }
}

/**
 * Ranked yield view for USD₮ / XAU₮ — deterministic, gas-aware.
 * `balanceHintUsd` is used to annualize gas drag for small positions.
 */
export function rankYieldOpportunities(input: {
  chain: AgentChainId;
  asset: "USDT" | "XAUT";
  balanceUsd: number;
}): DefiOpportunity[] {
  const { chain, asset, balanceUsd } = input;
  const gas = gasForChain(chain);
  const annualGasDragPct = balanceUsd > 0 ? (gas / balanceUsd) * 100 : 100;

  const baseApy =
    asset === "USDT"
      ? chain === "ethereum"
        ? 3.2
        : chain === "arbitrum"
          ? 4.1
          : chain === "polygon"
            ? 3.8
            : chain === "solana"
              ? 2.4
              : chain === "tron"
                ? 1.9
                : 2.1
      : chain === "ethereum"
        ? 2.0
        : 2.5;

  const protocols: DefiOpportunity[] = [
    {
      chain,
      protocol: "aave",
      pool: `${chain}-aave-${asset}`,
      asset,
      grossApyPct: baseApy,
      estGasUsd: gas,
      netApyAfterGasPct: Math.max(0, baseApy - annualGasDragPct),
    },
    {
      chain,
      protocol: "uniswap_v3",
      pool: `${chain}-uni-${asset}`,
      asset,
      grossApyPct: baseApy - 0.4,
      estGasUsd: gas * 1.2,
      netApyAfterGasPct: Math.max(0, baseApy - 0.4 - annualGasDragPct * 1.2),
    },
    {
      chain,
      protocol: "curve",
      pool: `${chain}-curve-${asset}`,
      asset,
      grossApyPct: baseApy - 0.9,
      estGasUsd: gas * 1.1,
      netApyAfterGasPct: Math.max(0, baseApy - 0.9 - annualGasDragPct * 1.1),
    },
  ];

  return protocols.sort((a, b) => b.netApyAfterGasPct - a.netApyAfterGasPct);
}
