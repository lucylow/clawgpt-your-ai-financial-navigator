import { describe, expect, it } from "vitest";
import { findOptimalExecutionChain } from "./gasOptimization";

describe("findOptimalExecutionChain", () => {
  it("ranks chains by relative score", () => {
    const rows = findOptimalExecutionChain({
      chains: ["ethereum", "arbitrum", "polygon"],
      notionalUsd: 5000,
      asset: "USDt",
      fromChain: "ethereum",
    });
    expect(rows).toHaveLength(3);
    const sorted = [...rows].sort((a, b) => b.score - a.score);
    expect(rows[0].chain).toBe(sorted[0].chain);
  });
});
