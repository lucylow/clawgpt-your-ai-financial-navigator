import { describe, expect, it } from "vitest";
import { createPlan } from "./planner.ts";
import { runAgentLoop } from "./agentLoop.ts";

describe("runAgentLoop", () => {
  it("completes a small transfer plan within policy", async () => {
    const goal = {
      id: "goal-loop-1",
      userId: "user-1",
      intent: "send 100 USDT to 0x1234567890123456789012345678901234567890",
      createdAt: Date.now(),
    };
    const plan = createPlan(goal);
    const out = await runAgentLoop(plan);
    expect(out.status).toBe("completed");
    expect(out.currentStepIndex).toBe(out.steps.length);
    expect(out.steps.every((s) => s.status === "completed")).toBe(true);
  });

  it("fails when transfer exceeds autonomy USD cap", async () => {
    const plan = createPlan({
      id: "goal-big",
      userId: "user-1",
      intent: "send 5000 USDT to 0x1234567890123456789012345678901234567890",
      createdAt: Date.now(),
    });
    const out = await runAgentLoop(plan);
    expect(out.status).toBe("failed");
    const failed = out.steps.find((s) => s.status === "failed");
    expect(failed?.error).toBe("Policy violation");
  });
});
