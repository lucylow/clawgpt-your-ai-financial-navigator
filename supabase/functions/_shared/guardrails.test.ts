import { describe, expect, it } from "vitest";
import { GUARDRAILS, riskAssessment } from "./guardrails.ts";

describe("riskAssessment", () => {
  it("blocks when amount exceeds single-tx pct of portfolio", () => {
    const portfolio = 10_000;
    const amount = 3000; // 30% > 25% max single
    const r = riskAssessment(amount, portfolio, 1);
    expect(r.level).toBe("BLOCKED");
    expect(r.reasons.some((x) => x.includes("30"))).toBe(true);
  });

  it("is low risk for small amount vs large portfolio", () => {
    const r = riskAssessment(50, 100_000, 0.5);
    expect(r.level).toBe("LOW");
  });
});

describe("GUARDRAILS", () => {
  it("has sensible defaults", () => {
    expect(GUARDRAILS.maxSingleTxPct).toBe(25);
    expect(GUARDRAILS.whitelistedProtocols).toContain("aave");
  });
});
