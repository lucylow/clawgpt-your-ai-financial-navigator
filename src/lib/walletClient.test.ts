import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockIsReady, mockSendTetherTransfer } = vi.hoisted(() => ({
  mockIsReady: vi.fn<[], boolean>(),
  mockSendTetherTransfer: vi.fn(),
}));

vi.mock("@/lib/wdkClient", () => ({
  clawWdk: {
    isReady: () => mockIsReady(),
    sendTetherTransfer: (args: unknown) => mockSendTetherTransfer(args),
  },
}));

describe("walletClient sendTransaction", () => {
  beforeEach(() => {
    vi.resetModules();
    mockIsReady.mockReset();
    mockSendTetherTransfer.mockReset();
  });

  it("returns WALLET_NOT_READY when WDK is not connected", async () => {
    mockIsReady.mockReturnValue(false);
    const { sendTransaction } = await import("@/lib/walletClient");
    const r = await sendTransaction(
      {
        chain: "ethereum",
        to: "0x0000000000000000000000000000000000000001",
        amount: "1",
        asset: "USDt",
      },
      { kind: "user_confirmed", confirmedAtMs: Date.now() },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect((r as { code: string }).code).toBe("WALLET_NOT_READY");
    expect(mockSendTetherTransfer).not.toHaveBeenCalled();
  });

  it("rejects sends without a valid user confirmation intent", async () => {
    mockIsReady.mockReturnValue(true);
    const { sendTransaction } = await import("@/lib/walletClient");
    const r = await sendTransaction(
      {
        chain: "ethereum",
        to: "0x0000000000000000000000000000000000000001",
        amount: "1",
        asset: "USDt",
      },
      { kind: "user_confirmed", confirmedAtMs: NaN },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect((r as { code: string }).code).toBe("VALIDATION");
    expect(mockIsReady).not.toHaveBeenCalled();
    expect(mockSendTetherTransfer).not.toHaveBeenCalled();
  });
});
