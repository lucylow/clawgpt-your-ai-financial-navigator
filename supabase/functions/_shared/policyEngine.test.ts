import { describe, expect, it } from "vitest";
import { evaluateOutboundTransferPolicy } from "./policyEngine.ts";

describe("evaluateOutboundTransferPolicy", () => {
  it("rejects when risk is blocked", () => {
    const out = evaluateOutboundTransferPolicy({
      amountUsd: 5000,
      portfolioNavUsd: 10_000,
      gasUsd: 1,
    });
    expect(out.decision).toBe("reject");
  });

  it("requires confirmation for first-time recipient", () => {
    const out = evaluateOutboundTransferPolicy({
      amountUsd: 10,
      portfolioNavUsd: 100_000,
      gasUsd: 0.5,
      firstTimeRecipient: true,
    });
    expect(out.decision).toBe("require_confirmation");
  });
});
