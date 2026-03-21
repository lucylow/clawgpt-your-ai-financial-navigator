import { describe, it, expect } from "vitest";
import { appendWorkflow, parseProposedPlan } from "@/lib/agentWorkflow";

describe("agentWorkflow", () => {
  it("parseProposedPlan accepts valid plans", () => {
    const p = parseProposedPlan({
      title: "Test",
      steps: ["a", "b"],
      requiresOnChainConfirmation: true,
    });
    expect(p?.title).toBe("Test");
    expect(p?.steps).toHaveLength(2);
  });

  it("parseProposedPlan rejects invalid input", () => {
    expect(parseProposedPlan({ title: "x" })).toBeNull();
  });

  it("appendWorkflow preserves order and caps growth via caller", () => {
    let log = appendWorkflow([], "intent", "hi");
    log = appendWorkflow(log, "plan", "step");
    expect(log).toHaveLength(2);
    expect(log[0].phase).toBe("intent");
    expect(log[1].detail).toBe("step");
  });
});
