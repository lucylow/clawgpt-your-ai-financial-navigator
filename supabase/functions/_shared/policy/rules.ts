import { DEMO_PORTFOLIO } from "../demoData.ts";
import { GUARDRAILS, riskAssessment } from "../guardrails.ts";
import { strArg } from "../toolArgs.ts";
import { getChainAndAsset, getGasUsdForContext, getPolicyAmount, getPortfolioNavUsd, isFinancialExecutionAction } from "./context.ts";
import type { Policy, PolicyContext, PolicyResult } from "./types.ts";

/** Optional absolute cap (USD notional). Set via Edge secret `POLICY_MAX_SINGLE_TX_USD`. */
function maxSingleTxUsd(): number | null {
  try {
    const raw = typeof Deno !== "undefined" ? Deno.env.get("POLICY_MAX_SINGLE_TX_USD") : undefined;
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Comma-separated allowlist; when non-empty, transfers must target one of these (lowercase). */
function recipientAllowlist(): string[] {
  try {
    const raw = typeof Deno !== "undefined" ? Deno.env.get("POLICY_RECIPIENT_ALLOWLIST") : undefined;
    if (!raw?.trim()) return [];
    return raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function riskGuardrailPolicy(): Policy {
  return {
    id: "risk-guardrails",
    name: "NAV / gas guardrails",
    evaluate(ctx: PolicyContext): PolicyResult {
      if (!isFinancialExecutionAction(ctx.action)) return { allowed: true };
      const amount = getPolicyAmount(ctx);
      const nav = getPortfolioNavUsd(ctx);
      const gas = getGasUsdForContext(ctx);
      const r = riskAssessment(amount, nav, gas);
      if (r.level === "BLOCKED") {
        return { allowed: false, reason: r.reasons.join("; ") };
      }
      return { allowed: true };
    },
  };
}

function maxAbsoluteUsdPolicy(): Policy {
  return {
    id: "max-absolute-usd",
    name: "Absolute max transfer (USD)",
    evaluate(ctx: PolicyContext): PolicyResult {
      if (!isFinancialExecutionAction(ctx.action)) return { allowed: true };
      const cap = maxSingleTxUsd();
      if (cap == null) return { allowed: true };
      const amount = getPolicyAmount(ctx);
      if (amount > cap) {
        return { allowed: false, reason: `Amount exceeds policy cap of $${cap.toLocaleString()} USD` };
      }
      return { allowed: true };
    },
  };
}

function recipientWhitelistPolicy(): Policy {
  return {
    id: "recipient-allowlist",
    name: "Recipient allowlist",
    evaluate(ctx: PolicyContext): PolicyResult {
      if (ctx.action !== "transfer_tokens") return { allowed: true };
      const allow = recipientAllowlist();
      if (allow.length === 0) return { allowed: true };
      const to = strArg(ctx.params, "to_address").toLowerCase();
      if (!to || !allow.includes(to)) {
        return { allowed: false, reason: "Recipient not in configured allowlist" };
      }
      return { allowed: true };
    },
  };
}

function sufficientBalancePolicy(): Policy {
  return {
    id: "sufficient-balance",
    name: "Sufficient balance (demo portfolio)",
    evaluate(ctx: PolicyContext): PolicyResult {
      if (!isFinancialExecutionAction(ctx.action)) return { allowed: true };
      const ca = getChainAndAsset(ctx);
      if (!ca) return { allowed: true };
      const row = DEMO_PORTFOLIO[ca.chain];
      if (!row) return { allowed: true };
      const amount = getPolicyAmount(ctx);
      const bal = row[ca.asset];
      if (amount > bal) {
        return {
          allowed: false,
          reason: `Insufficient ${ca.asset} on chain (need ${amount}, have ${bal})`,
        };
      }
      return { allowed: true };
    },
  };
}

function firstTimeRecipientPolicy(): Policy {
  return {
    id: "first-time-recipient",
    name: "First-time recipient confirmation",
    evaluate(ctx: PolicyContext): PolicyResult {
      if (ctx.action !== "outbound_preview") return { allowed: true };
      const first = Boolean(ctx.params.firstTimeRecipient);
      if (!first) return { allowed: true };
      return {
        allowed: true,
        requiresApproval: true,
        reason: "First-time recipient — confirm destination out-of-band if possible.",
      };
    },
  };
}

function mediumHighRiskApprovalPolicy(): Policy {
  return {
    id: "medium-high-risk-approval",
    name: "Elevated risk requires approval",
    evaluate(ctx: PolicyContext): PolicyResult {
      if (!isFinancialExecutionAction(ctx.action)) return { allowed: true };
      const amount = getPolicyAmount(ctx);
      const nav = getPortfolioNavUsd(ctx);
      const gas = getGasUsdForContext(ctx);
      const r = riskAssessment(amount, nav, gas);
      if (r.level === "HIGH" || r.level === "MEDIUM") {
        return {
          allowed: true,
          requiresApproval: true,
          reason: `Risk ${r.level}: ${r.reasons[0] ?? "Review before proceeding"}`,
        };
      }
      return { allowed: true };
    },
  };
}

/** Factory for user/session spending limits (programmable finance). */
export function createUserSpendingLimitPolicy(limitUsd: number, userId?: string): Policy {
  const id = userId ? `user-limit-${userId}` : "user-limit";
  return {
    id,
    name: "User spending limit",
    evaluate(ctx: PolicyContext): PolicyResult {
      if (!isFinancialExecutionAction(ctx.action)) return { allowed: true };
      if (userId && ctx.userId !== userId) return { allowed: true };
      const amount = getPolicyAmount(ctx);
      if (amount > limitUsd) {
        return { allowed: false, reason: `Exceeds your spending limit of $${limitUsd.toLocaleString()}` };
      }
      return { allowed: true };
    },
  };
}

export const defaultPolicyFactories: Array<() => Policy> = [
  riskGuardrailPolicy,
  maxAbsoluteUsdPolicy,
  recipientWhitelistPolicy,
  sufficientBalancePolicy,
  firstTimeRecipientPolicy,
  mediumHighRiskApprovalPolicy,
];

/** Parallel evaluation (all must allow) — optional composition helper. */
export function evaluateAllPolicies(policies: Policy[], ctx: PolicyContext): PolicyResult {
  for (const p of policies) {
    const res = p.evaluate(ctx);
    if (!res.allowed) {
      return { allowed: false, reason: `[${p.name}] ${res.reason ?? "Denied"}` };
    }
    if (res.requiresApproval) {
      return { ...res, reason: res.reason ?? `${p.name} requires approval` };
    }
  }
  return { allowed: true };
}
