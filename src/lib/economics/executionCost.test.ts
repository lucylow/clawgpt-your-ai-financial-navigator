import { describe, it, expect } from "vitest";
import { estimateBridgeExecutionCostUsd, estimateSwapSlippage } from "./executionCost";

describe("executionCost", () => {
  it("charges more for XAUt bridges than USDt", () => {
    const usdt = estimateBridgeExecutionCostUsd({
      fromChain: "ethereum",
      toChain: "arbitrum",
      notionalUsd: 10_000,
      asset: "USDt",
    });
    const xaut = estimateBridgeExecutionCostUsd({
      fromChain: "ethereum",
      toChain: "arbitrum",
      notionalUsd: 10_000,
      asset: "XAUt",
    });
    expect(xaut.totalUsd).toBeGreaterThan(usdt.totalUsd);
  });

  it("widens slippage for XAUt swaps", () => {
    const stables = estimateSwapSlippage({ fromAsset: "USDt", toAsset: "USDt", notionalUsd: 5000 });
    const gold = estimateSwapSlippage({ fromAsset: "USDt", toAsset: "XAUt", notionalUsd: 5000 });
    expect(gold.basisPoints).toBeGreaterThan(stables.basisPoints);
  });
});
