import { describe, it, expect } from "vitest";
import {
  evaluateBridgeMove,
  evaluateUsdTSpend,
  globalUsdTReserveBreached,
  minUsdTKeepOnChainUsd,
} from "./portfolioPolicy";

const sampleNested = {
  ethereum: { USDt: 4800, XAUt: 400 },
  arbitrum: { USDt: 2000, XAUt: 150 },
  polygon: { USDt: 2800, XAUt: 300 },
  solana: { USDt: 900, XAUt: 300 },
  tron: { USDt: 500 },
  ton: { USDt: 610 },
};

const sampleAlloc = {
  ethereum: 5200,
  polygon: 3100,
  arbitrum: 2150,
  solana: 1200,
  tron: 500,
  ton: 610,
};

describe("portfolioPolicy", () => {
  it("holds when net edge is too small (default benefit)", () => {
    const d = evaluateBridgeMove({
      allocation: sampleAlloc,
      allocationByAsset: sampleNested,
      fromChain: "ethereum",
      toChain: "arbitrum",
      amountUsd: 800,
      asset: "USDt",
    });
    expect(d.action).toBe("hold");
  });

  it("proceeds when expected benefit clears costs", () => {
    const d = evaluateBridgeMove({
      allocation: sampleAlloc,
      allocationByAsset: sampleNested,
      fromChain: "ethereum",
      toChain: "arbitrum",
      amountUsd: 800,
      asset: "USDt",
      expectedBenefitUsd: 120,
    });
    expect(d.action).toBe("proceed");
  });

  it("refuses micro transfers that waste fees", () => {
    const r = evaluateUsdTSpend({
      allocationByAsset: sampleNested,
      chain: "ethereum",
      amountUsd: 3,
      totalPortfolioUsd: 12760,
    });
    expect(r.ok).toBe(false);
  });

  it("blocks spend that breaches local USDt floor", () => {
    const r = evaluateUsdTSpend({
      allocationByAsset: { ethereum: { USDt: 100 } },
      chain: "ethereum",
      amountUsd: 95,
      totalPortfolioUsd: 5000,
    });
    expect(r.ok).toBe(false);
  });

  it("detects global USDt sleeve shortfall", () => {
    expect(globalUsdTReserveBreached(50, 10_000)).toBe(true);
    expect(globalUsdTReserveBreached(900, 10_000)).toBe(false);
  });

  it("computes per-chain keep floor", () => {
    expect(minUsdTKeepOnChainUsd(4800)).toBeGreaterThan(50);
  });
});
