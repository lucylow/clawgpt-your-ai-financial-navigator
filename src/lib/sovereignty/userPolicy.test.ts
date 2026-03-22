import { describe, expect, it } from "vitest";
import type { WdkChainId } from "@/config/chains";
import {
  defaultUserPolicy,
  evaluateUserPolicyForBridge,
  evaluateUserPolicyForTransfer,
  parseUserPolicyJson,
} from "./userPolicy";

describe("userPolicy", () => {
  it("defaults allow large demo transfers", () => {
    const p = defaultUserPolicy();
    expect(evaluateUserPolicyForTransfer(p, { chain: "ethereum", amountUsd: 10_000 }).ok).toBe(true);
  });

  it("blocks when execution paused", () => {
    const p = { ...defaultUserPolicy(), blockAgentExecution: true };
    expect(evaluateUserPolicyForTransfer(p, { chain: "ethereum", amountUsd: 1 }).ok).toBe(false);
  });

  it("blocks disallowed chain", () => {
    const p = { ...defaultUserPolicy(), approvedChains: ["arbitrum"] as WdkChainId[] };
    expect(evaluateUserPolicyForTransfer(p, { chain: "ethereum", amountUsd: 1 }).ok).toBe(false);
  });

  it("blocks over max single tx", () => {
    const p = { ...defaultUserPolicy(), maxSingleTxUsd: 100 };
    expect(evaluateUserPolicyForTransfer(p, { chain: "ethereum", amountUsd: 101 }).ok).toBe(false);
  });

  it("bridge requires both chains approved", () => {
    const p = { ...defaultUserPolicy(), approvedChains: ["ethereum", "arbitrum"] as WdkChainId[] };
    expect(evaluateUserPolicyForBridge(p, { fromChain: "ethereum", toChain: "arbitrum", amountUsd: 50 }).ok).toBe(
      true,
    );
    const p2 = { ...defaultUserPolicy(), approvedChains: ["ethereum"] as WdkChainId[] };
    expect(evaluateUserPolicyForBridge(p2, { fromChain: "ethereum", toChain: "arbitrum", amountUsd: 50 }).ok).toBe(
      false,
    );
  });

  it("parses exported JSON", () => {
    const p = defaultUserPolicy();
    const raw = JSON.stringify(p);
    const out = parseUserPolicyJson(raw);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.policy.maxSingleTxUsd).toBe(p.maxSingleTxUsd);
  });
});
