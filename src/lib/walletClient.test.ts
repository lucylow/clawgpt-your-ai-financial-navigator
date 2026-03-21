import { describe, expect, it, vi, beforeEach } from "vitest";

describe("walletClient sendTransaction", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns WALLET_NOT_READY when WDK is not connected", async () => {
    const wdk = await import("@/lib/wdkClient");
    vi.spyOn(wdk.clawWdk, "isReady").mockReturnValue(false);
    const { sendTransaction } = await import("@/lib/walletClient");
    const r = await sendTransaction({
      chain: "ethereum",
      to: "0x0000000000000000000000000000000000000001",
      amount: "1",
      asset: "USDt",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("WALLET_NOT_READY");
  });
});
