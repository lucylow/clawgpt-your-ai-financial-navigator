/**
 * User-owned execution policy (client-side contract).
 * Gates sensitive actions before wallet signing; portable via JSON export/import.
 */
import { SUPPORTED_WDK_CHAINS, type WdkChainId } from "@/config/chains";
import type { AgentSessionMemoryV1 } from "@/lib/agent";

export const USER_POLICY_VERSION = 1 as const;

export type UserPolicyV1 = {
  v: typeof USER_POLICY_VERSION;
  /** Max notional (USD) for a single outgoing transfer / bridge leg. */
  maxSingleTxUsd: number;
  /** Chains the user allows for value movement in this session (subset of WDK chains). */
  approvedChains: WdkChainId[];
  /** When true, block all confirmable cards (user halt switch). */
  blockAgentExecution: boolean;
  /** Optional daily outgoing cap (client-enforced best-effort; not on-chain). */
  maxDailyUsdOut?: number;
  /** Updated when policy changes (ms). */
  updatedAtMs: number;
};

export function defaultUserPolicy(): UserPolicyV1 {
  return {
    v: USER_POLICY_VERSION,
    maxSingleTxUsd: 1_000_000,
    approvedChains: [...SUPPORTED_WDK_CHAINS],
    blockAgentExecution: false,
    updatedAtMs: Date.now(),
  };
}

export function sessionMemoryFromUserPolicy(
  policy: UserPolicyV1,
  opts?: { demoMode?: boolean; activeChainKey?: WdkChainId },
): AgentSessionMemoryV1 {
  return {
    v: 1,
    automationPaused: policy.blockAgentExecution,
    dailyLimitUsd: policy.maxDailyUsdOut,
    demoMode: opts?.demoMode,
    activeChainKey: opts?.activeChainKey,
    maxSingleTxUsd: policy.maxSingleTxUsd,
    approvedChainKeys: policy.approvedChains,
  };
}

export function evaluateUserPolicyForTransfer(
  policy: UserPolicyV1,
  input: { chain: string; amountUsd: number },
): { ok: true } | { ok: false; reason: string } {
  if (policy.blockAgentExecution) {
    return { ok: false, reason: "Execution is paused in your policy — resume in Policy settings." };
  }
  if (!policy.approvedChains.includes(input.chain as WdkChainId)) {
    return {
      ok: false,
      reason: `Chain "${input.chain}" is not in your approved list. Add it under Policy or choose another network.`,
    };
  }
  if (typeof input.amountUsd === "number" && input.amountUsd > policy.maxSingleTxUsd) {
    return {
      ok: false,
      reason: `Amount exceeds your max single transaction ($${policy.maxSingleTxUsd.toLocaleString()}). Raise the cap in Policy if intended.`,
    };
  }
  return { ok: true };
}

export function evaluateUserPolicyForBridge(
  policy: UserPolicyV1,
  input: { fromChain: string; toChain: string; amountUsd: number },
): { ok: true } | { ok: false; reason: string } {
  const a = evaluateUserPolicyForTransfer(policy, { chain: input.fromChain, amountUsd: input.amountUsd });
  if (!a.ok) return a;
  const b = evaluateUserPolicyForTransfer(policy, { chain: input.toChain, amountUsd: input.amountUsd });
  if (!b.ok) {
    return {
      ok: false,
      reason: `Bridge touches "${input.toChain}" which is outside your approved chains.`,
    };
  }
  return { ok: true };
}

function isWdkChainId(s: string): s is WdkChainId {
  return (SUPPORTED_WDK_CHAINS as readonly string[]).includes(s);
}

export function parseUserPolicyJson(raw: string): { ok: true; policy: UserPolicyV1 } | { ok: false; error: string } {
  try {
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== "object") return { ok: false, error: "Invalid JSON" };
    const o = j as Record<string, unknown>;
    if (o.v !== 1) return { ok: false, error: "Unsupported policy version" };
    const maxSingleTxUsd = Number(o.maxSingleTxUsd);
    if (!Number.isFinite(maxSingleTxUsd) || maxSingleTxUsd <= 0) {
      return { ok: false, error: "maxSingleTxUsd must be a positive number" };
    }
    const chainsRaw = o.approvedChains;
    if (!Array.isArray(chainsRaw) || chainsRaw.length === 0) {
      return { ok: false, error: "approvedChains must be a non-empty array" };
    }
    const approvedChains: WdkChainId[] = [];
    for (const c of chainsRaw) {
      if (typeof c !== "string" || !isWdkChainId(c)) {
        return { ok: false, error: `Invalid chain id: ${String(c)}` };
      }
      approvedChains.push(c);
    }
    const blockAgentExecution = Boolean(o.blockAgentExecution);
    let maxDailyUsdOut: number | undefined;
    if (o.maxDailyUsdOut != null) {
      const d = Number(o.maxDailyUsdOut);
      if (!Number.isFinite(d) || d <= 0) return { ok: false, error: "maxDailyUsdOut must be positive if set" };
      maxDailyUsdOut = d;
    }
    const policy: UserPolicyV1 = {
      v: 1,
      maxSingleTxUsd,
      approvedChains,
      blockAgentExecution,
      maxDailyUsdOut,
      updatedAtMs: typeof o.updatedAtMs === "number" ? o.updatedAtMs : Date.now(),
    };
    return { ok: true, policy };
  } catch {
    return { ok: false, error: "Could not parse policy file" };
  }
}

export function stringifyUserPolicy(policy: UserPolicyV1): string {
  return JSON.stringify(policy, null, 2);
}
