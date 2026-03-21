import { describe, expect, it } from "vitest";
import { classifyWalletError } from "@/lib/web3Errors";

describe("classifyWalletError", () => {
  it("detects user rejection", () => {
    const r = classifyWalletError("User denied transaction signature");
    expect(r.code).toBe("USER_REJECTED");
    expect(r.hint.length).toBeGreaterThan(0);
  });

  it("detects network failures", () => {
    const r = classifyWalletError("fetch failed: ECONNRESET");
    expect(r.code).toBe("NETWORK");
  });

  it("detects insufficient funds", () => {
    const r = classifyWalletError("insufficient funds for gas * price + value");
    expect(r.code).toBe("INSUFFICIENT_FUNDS");
  });
});
