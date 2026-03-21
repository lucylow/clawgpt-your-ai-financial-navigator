import { logPolicyDecision } from "./logger.ts";
import { defaultPolicyFactories } from "./rules.ts";
import type { Policy, PolicyContext, PolicyResult } from "./types.ts";

const policies: Policy[] = [];
let defaultsRegistered = false;

export function registerPolicy(policy: Policy): void {
  const idx = policies.findIndex((p) => p.id === policy.id);
  if (idx >= 0) policies[idx] = policy;
  else policies.push(policy);
}

export function resetPoliciesForTests(): void {
  policies.length = 0;
  defaultsRegistered = false;
}

export function ensureDefaultPolicies(): void {
  if (defaultsRegistered) return;
  defaultsRegistered = true;
  for (const f of defaultPolicyFactories) {
    registerPolicy(f());
  }
}

export function listPolicies(): readonly Policy[] {
  ensureDefaultPolicies();
  return policies;
}

/**
 * Sequential evaluation: first denial or approval-gate wins.
 * Pre-phase policies only; register `phase: "post"` for post-validation (see `evaluatePostPolicies`).
 */
export function evaluatePolicies(ctx: PolicyContext): PolicyResult {
  ensureDefaultPolicies();
  for (const policy of policies) {
    if (policy.phase === "post") continue;
    const result = policy.evaluate(ctx);
    logPolicyDecision(ctx, result, policy.id);
    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.reason ? `[${policy.name}] ${result.reason}` : `[${policy.name}] Denied`,
      };
    }
    if (result.requiresApproval) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: result.reason ?? `${policy.name} requires explicit approval`,
      };
    }
  }
  return { allowed: true };
}

export function evaluatePostPolicies(ctx: PolicyContext): PolicyResult {
  ensureDefaultPolicies();
  const post = policies.filter((p) => p.phase === "post");
  for (const policy of post) {
    const result = policy.evaluate(ctx);
    logPolicyDecision(ctx, result, policy.id);
    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.reason ? `[${policy.name}] ${result.reason}` : `[${policy.name}] Post-check failed`,
      };
    }
  }
  return { allowed: true };
}
