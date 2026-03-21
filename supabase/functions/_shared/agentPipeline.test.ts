import { describe, expect, it } from "vitest";
import { runAgentPipeline } from "./agentPipeline.ts";

const corr = "00000000-0000-4000-8000-000000000001";

describe("runAgentPipeline — synthetic conversations", () => {
  it("classifies portfolio overview", () => {
    const { contract } = runAgentPipeline("Show my portfolio summary", [], corr);
    expect(contract.intent).toBe("info.portfolio_overview");
    expect(contract.requestKind).toBe("informational");
    expect(contract.toolPlan.some((s) => s.tool === "get_portfolio")).toBe(true);
  });

  it("classifies per-chain balances", () => {
    const { contract } = runAgentPipeline("How much USDt do I have on each chain?", [], corr);
    expect(contract.intent).toBe("info.balances_by_chain");
    expect(contract.missingFields.length).toBe(0);
  });

  it("detects missing fields for transfer", () => {
    const { contract } = runAgentPipeline("Send some USDt to my savings wallet on Polygon", [], corr);
    expect(contract.intent).toBe("exec.transfer");
    expect(contract.missingFields).toContain("amount");
    expect(contract.requestKind).toBe("needs_clarification");
    expect(contract.status).toBe("awaiting_clarification");
    expect(contract.nextUserQuestion).toBeDefined();
  });

  it("preview shifts to planning_only", () => {
    const { contract } = runAgentPipeline("Actually preview the transfer first", [], corr);
    expect(contract.entities.previewOnly).toBe(true);
  });

  it("bridge route comparison needs amount and chains", () => {
    const { contract } = runAgentPipeline("What's the cheapest way to bridge?", [], corr);
    expect(["plan.compare_routes", "exec.bridge"]).toContain(contract.intent);
    expect(contract.missingFields.length).toBeGreaterThan(0);
  });

  it("automation pause is confirmation-gated", () => {
    const { contract } = runAgentPipeline("Pause all automation until tomorrow", [], corr);
    expect(contract.intent).toBe("mgmt.automation_pause");
    expect(contract.requestKind).toBe("confirmation_required");
    expect(contract.requiresConfirmation).toBe(true);
  });

  it("resume automation", () => {
    const { contract } = runAgentPipeline("Resume automation", [], corr);
    expect(contract.intent).toBe("mgmt.automation_resume");
  });

  it("extracts amount, asset, chain, and address for transfer", () => {
    const { contract } = runAgentPipeline(
      "Send 25 USDt to 0x742d35Cc6634C0532925a3b844Bc9e7595f213bE on polygon",
      [],
      corr,
    );
    expect(contract.intent).toBe("exec.transfer");
    expect(contract.entities.amount?.value).toBe(25);
    expect(contract.entities.assets).toContain("USDt");
    expect(contract.entities.chainKeys).toContain("polygon");
    expect(contract.entities.toAddress?.value).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("merges session memory chain", () => {
    const { contract } = runAgentPipeline("What are my balances?", [], corr, {
      v: 1,
      activeChainKey: "arbitrum",
    });
    expect(contract.entities.chainKeys).toContain("arbitrum");
  });

  it("emits telemetry keys", () => {
    const { telemetry } = runAgentPipeline("Explain why bridges can be risky", [], corr);
    expect(telemetry).toHaveProperty("intent");
    expect(telemetry).toHaveProperty("requestKind");
    expect(telemetry).toHaveProperty("confidence");
    expect(telemetry).toHaveProperty("lifecycleStatus");
  });

  it("classifies retry and wallet-details meta/informational intents", () => {
    const r = runAgentPipeline("Retry that last step", [], corr);
    expect(r.contract.intent).toBe("meta.retry");
    const w = runAgentPipeline("Show my wallet address context", [], corr);
    expect(w.contract.intent).toBe("info.wallet_details");
  });

  it("executable transfer reaches awaiting_confirmation when fully specified", () => {
    const { contract } = runAgentPipeline(
      "Send 10 USDt to 0x742d35Cc6634C0532925a3b844Bc9e7595f213bE on polygon",
      [],
      corr,
    );
    expect(contract.requestKind).toBe("executable");
    expect(contract.status).toBe("awaiting_confirmation");
    expect(contract.missingFields).toHaveLength(0);
  });

  it("prepare transfer intent needs clarification without amount", () => {
    const { contract } = runAgentPipeline("Prepare a transfer to my cold wallet", [], corr);
    expect(contract.intent).toBe("plan.prepare_transfer");
    expect(contract.requestKind).toBe("needs_clarification");
  });
});
