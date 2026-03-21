import { GUARDRAILS, riskAssessment } from "./guardrails.ts";
import { evaluatePolicies } from "./policy/engine.ts";

export type PolicyDecision = "allow_preview" | "require_confirmation" | "reject";

export type OutboundPolicyInput = {
  amountUsd: number;
  portfolioNavUsd: number;
  gasUsd: number;
  /** When true, user has not confirmed this recipient before (future: contact list) */
  firstTimeRecipient?: boolean;
};

/**
 * Bounded autonomy: composable policy engine + risk copy for the agent pipeline.
 * Wallet execution remains client-side (WDK); this layer gates reasoning and confirmation.
 */
export function evaluateOutboundTransferPolicy(input: OutboundPolicyInput): {
  decision: PolicyDecision;
  reasons: string[];
} {
  const r = riskAssessment(input.amountUsd, input.portfolioNavUsd, input.gasUsd);
  const reasons = [...r.reasons];

  const pr = evaluatePolicies({
    userId: "pipeline",
    action: "outbound_preview",
    params: {
      amountUsd: input.amountUsd,
      firstTimeRecipient: Boolean(input.firstTimeRecipient),
    },
    state: {
      portfolioNavUsd: input.portfolioNavUsd,
      gasUsd: input.gasUsd,
    },
  });

  if (!pr.allowed) {
    return { decision: "reject", reasons: [pr.reason ?? "Policy denied", ...reasons].filter(Boolean) };
  }

  if (pr.requiresApproval) {
    const msg = pr.reason ?? "Explicit confirmation required";
    return { decision: "require_confirmation", reasons: [msg, ...reasons] };
  }

  return { decision: "allow_preview", reasons };
}

export function policySummaryLines(): string[] {
  return [
    `Max single tx: ${GUARDRAILS.maxSingleTxPct}% NAV`,
    `Max daily spend: ${GUARDRAILS.maxDailySpendPct}% NAV`,
    `USDt reserve floor: ${GUARDRAILS.minReserveUsdT * 100}% NAV`,
    `Protocols: ${GUARDRAILS.whitelistedProtocols.join(", ")}`,
  ];
}
