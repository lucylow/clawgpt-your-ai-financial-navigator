import { describe, expect, it } from "vitest";
import { SafetyService } from "./safety.service.js";

const mockDb = {
  user: {
    findUnique: async () => ({
      spendingLimits: { perTxUsd: 10, dailyUsd: 100 },
      recipientAllowlist: null,
      microPaymentAutoApprove: false,
    }),
  },
  agentActionLog: {
    findMany: async () => [],
    aggregate: async () => ({ _sum: {} }),
  },
} as unknown as ConstructorParameters<typeof SafetyService>[0];

describe("SafetyService", () => {
  const safety = new SafetyService(mockDb);

  it("blocks amounts above per-tx limit", async () => {
    const r = await safety.checkTx(
      "u1",
      {
        userId: "u1",
        walletId: "w1",
        chain: "polygon",
        asset: "USDT",
        amount: "20",
        toAddress: "0x1234567890123456789012345678901234567890",
      },
      { skipConfirmGate: true },
    );
    expect(r.safe).toBe(false);
    expect(r.reason).toMatch(/per-transaction/i);
  });

  it("allows small tx under cap", async () => {
    const r = await safety.checkTx(
      "u1",
      {
        userId: "u1",
        walletId: "w1",
        chain: "polygon",
        asset: "USDT",
        amount: "5",
        toAddress: "0x1234567890123456789012345678901234567890",
        amountUsdHint: 5,
      },
      { skipConfirmGate: true },
    );
    expect(r.safe).toBe(true);
  });
});
