import { describe, expect, it } from "vitest";
import { createPlan } from "./planner.ts";

describe("createPlan", () => {
  it("throws for unsupported intent", () => {
    expect(() =>
      createPlan({
        id: "g1",
        userId: "u1",
        intent: "what is my balance",
        createdAt: Date.now(),
      }),
    ).toThrow("Unsupported intent");
  });

  it("builds a send flow with parsed entities", () => {
    const plan = createPlan({
      id: "g2",
      userId: "u1",
      intent: "send 50 USDT to 0x1234567890123456789012345678901234567890 on polygon",
      createdAt: Date.now(),
    });
    expect(plan.status).toBe("active");
    expect(plan.steps.map((s) => s.action)).toEqual([
      "get_balance",
      "prepare_transfer",
      "confirm_transfer",
      "execute_transfer",
    ]);
    const exec = plan.steps.find((s) => s.action === "execute_transfer");
    expect(exec?.params.amount).toBe(50);
    expect(exec?.params.chain).toBe("polygon");
    expect(exec?.params.asset).toBe("USDt");
    expect(exec?.params.to_address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
