import { describe, expect, it } from "vitest";
import type { AgentContractV1 } from "./agentContract.ts";
import { executeTool } from "./toolExecutor.ts";

const baseContract = (partial: Partial<AgentContractV1>): AgentContractV1 =>
  ({
    v: 1,
    intent: "exec.transfer",
    intentCategory: "execution",
    confidence: 0.9,
    entities: { chainKeys: [], assets: [], rawTextNotes: [] },
    assumptions: [],
    missingFields: [],
    riskLevel: "low",
    requiresConfirmation: true,
    requestKind: "executable",
    toolPlan: [],
    memoryUpdates: {},
    userFacingSummary: "",
    internalNotes: [],
    correlationId: "00000000-0000-4000-8000-000000000001",
    status: "awaiting_confirmation",
    policyHints: [],
    ...partial,
  }) as AgentContractV1;

describe("executeTool", () => {
  it("returns unknown tool message for bad name", () => {
    const r = executeTool("not_a_real_tool", {});
    expect(r.text).toContain("Unknown tool");
  });

  it("risk_check returns structured text", () => {
    const r = executeTool("risk_check", { amount: 10, action: "transfer", chain: "ethereum" });
    expect(r.text).toContain("Risk Assessment");
  });

  it("blocks execution-class tools when contract awaits clarification", () => {
    const c = baseContract({
      requestKind: "needs_clarification",
      status: "awaiting_clarification",
      missingFields: ["amount", "destination"],
    });
    const r = executeTool(
      "transfer_tokens",
      { chain: "polygon", asset: "USDt", amount: 1, to_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f213bE" },
      c,
    );
    expect(r.text).toContain("Execution gated");
    expect(r.text).toContain("amount");
  });

  it("allows transfer_tokens when contract is complete", () => {
    const c = baseContract({
      requestKind: "executable",
      status: "awaiting_confirmation",
      missingFields: [],
    });
    const r = executeTool(
      "transfer_tokens",
      { chain: "polygon", asset: "USDt", amount: 1, to_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f213bE" },
      c,
    );
    expect(r.text).toContain("Transfer prepared");
    expect(r.transactionLifecycle?.v).toBe(1);
    expect(r.transactionLifecycle?.state).toBe("previewed");
  });

  it("transfer_tokens sets transactionLifecycle blocked when policy blocks", () => {
    const c = baseContract({ requestKind: "executable", status: "awaiting_confirmation", missingFields: [] });
    const r = executeTool(
      "transfer_tokens",
      {
        chain: "ethereum",
        asset: "USDt",
        amount: 5000,
        to_address: "0x742d35Cc6634C0532925a3b844Bc9e7595f213bE",
      },
      c,
    );
    expect(r.transactionLifecycle?.state).toBe("blocked");
  });
});
