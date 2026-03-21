import { describe, it, expect } from "vitest";
import { shouldApplyPortfolioMetadata } from "@/lib/agentClient";

describe("agentClient", () => {
  it("shouldApplyPortfolioMetadata is false unless opted in", () => {
    expect(shouldApplyPortfolioMetadata(undefined)).toBe(false);
    expect(shouldApplyPortfolioMetadata({})).toBe(false);
    expect(shouldApplyPortfolioMetadata({ portfolioUpdate: { type: "transfer" } })).toBe(false);
    expect(shouldApplyPortfolioMetadata({ applyPortfolioUpdate: true })).toBe(true);
  });
});
