import { describe, expect, it } from "vitest";
import { OpenClawAgent } from "./openclaw-agent.js";
import type { MultiChainBalances } from "../lib/constants.js";

const emptyBalances: MultiChainBalances = {
  ethereum: { USDT: "0" },
  polygon: { USDT: "0" },
  arbitrum: { USDT: "0" },
  solana: { USDT: "0" },
  tron: { USDT: "0" },
  ton: { USDT: "0" },
};

describe("OpenClawAgent", () => {
  const agent = new OpenClawAgent();

  it("parses send 5 USDT to address on Polygon", async () => {
    const msg =
      "Send 5 USDt to 0x1234567890123456789012345678901234567890 on Polygon";
    const res = await agent.process("user1", msg, {
      defaultWalletId: "wallet1",
      balances: emptyBalances,
      idleUsdtHint: 0,
    });
    expect(res.intent).toBe("SEND_PAYMENT");
    expect(res.plan.length).toBe(1);
    expect(res.plan[0].tool).toBe("sendToken");
    const p = res.plan[0].params as Record<string, unknown>;
    expect(p.chain).toBe("polygon");
    expect(p.amount).toBe("5");
    expect(p.walletId).toBe("wallet1");
  });
});
