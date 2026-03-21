import { describe, expect, it } from "vitest";
import { validateAddressForChain } from "./addressValidation.ts";

describe("validateAddressForChain", () => {
  it("accepts valid EVM address", () => {
    const r = validateAddressForChain(
      "ethereum",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    );
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects invalid EVM address", () => {
    const r = validateAddressForChain("polygon", "0x123");
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("requires address when empty", () => {
    const r = validateAddressForChain("arbitrum", "");
    expect(r.valid).toBe(false);
  });
});
