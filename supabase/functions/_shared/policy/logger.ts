import type { PolicyContext, PolicyResult } from "./types.ts";

/** Structured policy decision logging — safe for observability pipelines. */
export function logPolicyDecision(
  ctx: PolicyContext,
  result: PolicyResult,
  policyId?: string,
): void {
  console.log(
    JSON.stringify({
      kind: "policy_decision",
      policyId: policyId ?? null,
      action: ctx.action,
      userId: ctx.userId,
      allowed: result.allowed,
      requiresApproval: Boolean(result.requiresApproval),
      reason: result.reason ?? null,
    }),
  );
}
