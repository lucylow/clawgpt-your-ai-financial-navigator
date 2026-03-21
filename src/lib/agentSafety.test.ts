import { describe, expect, it } from "vitest";
import { buildDemoTransferSafety, shouldBlockExecution, validateAddressForChain } from "./agentSafety";

describe("validateAddressForChain", () => {
  it("accepts EVM checksum-agnostic hex", () => {
    const r = validateAddressForChain(
      "ethereum",
      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    );
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects empty recipient", () => {
    const r = validateAddressForChain("polygon", "");
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("required"))).toBe(true);
  });

  it("rejects bad EVM length", () => {
    const r = validateAddressForChain("arbitrum", "0xabc");
    expect(r.valid).toBe(false);
  });
});

describe("shouldBlockExecution", () => {
  it("blocks when policy fails", () => {
    const s = buildDemoTransferSafety("ethereum", "", 10, "USDt", 2);
    expect(shouldBlockExecution(s)).toBe(true);
  });
});
