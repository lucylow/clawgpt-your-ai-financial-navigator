import { describe, expect, it } from "vitest";
import { assessTransaction } from "./risk-engine";

describe("assessTransaction", () => {
  it("flags high gas-to-notional ratio", () => {
    const r = assessTransaction({
      amountUsd: 10,
      to: "0x1234567890123456789012345678901234567890",
      chain: "ethereum",
      gasEstimateUsd: 2,
    });
    expect(r.individual.some((x) => x.reason.includes("Gas is high"))).toBe(true);
    expect(r.recommendation).toBe("REVIEW");
  });

  it("blocks when daily limit would be exceeded", () => {
    const r = assessTransaction({
      amountUsd: 2000,
      to: "0x1234567890123456789012345678901234567890",
      chain: "ethereum",
      gasEstimateUsd: 1,
      spentTodayUsd: 24_000,
      dailyLimitUsd: 25_000,
    });
    expect(r.recommendation).toBe("BLOCK");
  });
});
