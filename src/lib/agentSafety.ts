/**
 * Agent execution safety layers for financial actions:
 * approval gates, structured previews, address validation, policy checks, and tx simulation summaries.
 * Keep behavior aligned with `supabase/functions/agent-chat/index.ts` (server enforces; client re-checks).
 */

export type ApprovalSurface = "transaction_card" | "wallet";

export interface AgentApprovalGate {
  required: true;
  reason: string;
  surface: ApprovalSurface;
}

export interface AgentActionPreview {
  title: string;
  steps: string[];
  contracts: Array<{ label: string; address: string }>;
  amounts: Array<{ label: string; value: string }>;
}

export interface AddressValidationResult {
  valid: boolean;
  chain: string;
  normalized?: string;
  errors: string[];
}

export interface PolicyCheckResult {
  passed: boolean;
  violations: string[];
  guardrailSummary: string[];
}

export type SimulationOutcome = "ok" | "would_revert" | "unknown";

export interface TransactionSimulationSummary {
  outcome: SimulationOutcome;
  gasEstimateUsd: number;
  summary: string;
  /** How this summary was produced (production should use eth_call / simulateV1 / Tenderly). */
  method: "heuristic_model";
}

export interface AgentSafetyEnvelope {
  approvalGate: AgentApprovalGate;
  actionPreview: AgentActionPreview;
  addressValidation: AddressValidationResult;
  policy: PolicyCheckResult;
  transactionSimulation: TransactionSimulationSummary;
}

const EVM_ADDR = /^0x[a-fA-F0-9]{40}$/;
/** Tron base58, typical length 34 */
const TRON_ADDR = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
/** Solana base58 public key — length 32–44 */
const SOL_ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** TON user-friendly (simplified check) */
const TON_ADDR = /^(EQ|UQ)[a-zA-Z0-9_-]{40,}$/;

export function validateAddressForChain(chain: string, raw?: string | null): AddressValidationResult {
  const errors: string[] = [];
  const addr = typeof raw === "string" ? raw.trim() : "";

  if (!addr) {
    errors.push("Recipient address is required before execution.");
    return { valid: false, chain, errors };
  }

  if (chain === "ethereum" || chain === "polygon" || chain === "arbitrum") {
    if (!EVM_ADDR.test(addr)) {
      errors.push("Invalid EVM address (expect 0x + 40 hex chars).");
    }
    return {
      valid: errors.length === 0,
      chain,
      normalized: addr.startsWith("0x") ? addr : undefined,
      errors,
    };
  }

  if (chain === "solana") {
    if (!SOL_ADDR.test(addr)) {
      errors.push("Invalid Solana address format.");
    }
    return { valid: errors.length === 0, chain, errors };
  }

  if (chain === "tron") {
    if (!TRON_ADDR.test(addr)) {
      errors.push("Invalid Tron address (expect T + 33 base58 chars).");
    }
    return { valid: errors.length === 0, chain, errors };
  }

  if (chain === "ton") {
    if (!TON_ADDR.test(addr)) {
      errors.push("Invalid TON address (user-friendly format).");
    }
    return { valid: errors.length === 0, chain, errors };
  }

  errors.push(`Unknown chain for validation: ${chain}`);
  return { valid: false, chain, errors };
}

export function shouldBlockExecution(safety: AgentSafetyEnvelope | undefined): boolean {
  if (!safety) return false;
  if (!safety.policy.passed) return true;
  if (!safety.addressValidation.valid) return true;
  if (safety.transactionSimulation.outcome === "would_revert") return true;
  return false;
}

/** Build a safety envelope from server metadata + local contract context (live agent path). */
export function buildSafetyFromAgentMetadata(meta: {
  contractContext?: Record<string, unknown>;
  safety?: AgentSafetyEnvelope;
}): AgentSafetyEnvelope | undefined {
  if (meta.safety && meta.safety.approvalGate?.required) {
    return meta.safety;
  }
  const ctx = meta.contractContext;
  if (!ctx || typeof ctx !== "object") return undefined;
  const action = String((ctx as { action?: string }).action ?? "");
  if (action !== "erc20_transfer") return undefined;

  const chain = String((ctx as { chain?: string }).chain ?? "");
  const to = (ctx as { to?: string }).to != null ? String((ctx as { to?: string }).to) : "";
  const amount = Number((ctx as { amount?: number }).amount);
  const asset = String((ctx as { asset?: string }).asset ?? "USDt");
  const tokenContract = String((ctx as { tokenContract?: string }).tokenContract ?? "");

  const addr = validateAddressForChain(chain, to);
  const gasUsd = 2.5;
  const policyViolations: string[] = [];
  if (!addr.valid) policyViolations.push(...addr.errors);
  if (!Number.isFinite(amount) || amount <= 0) {
    policyViolations.push("Amount must be a positive number.");
  }

  const preview: AgentActionPreview = {
    title: "Token transfer",
    steps: [
      "Validate recipient and chain",
      "Simulate transfer (balance + allowance)",
      "Submit only after explicit confirmation",
    ],
    contracts: tokenContract
      ? [
          { label: "Token", address: tokenContract },
        ]
      : [],
    amounts: [{ label: "Send", value: `${Number.isFinite(amount) ? amount : "?"} ${asset}` }],
  };

  const sim: TransactionSimulationSummary = {
    outcome: addr.valid && policyViolations.length === 0 ? "ok" : "unknown",
    gasEstimateUsd: gasUsd,
    summary:
      addr.valid && policyViolations.length === 0
        ? "Heuristic: transfer calldata encodes ERC-20 transfer; no revert flags in model (use RPC eth_call for production)."
        : "Simulation skipped — fix address / policy first.",
    method: "heuristic_model",
  };

  return {
    approvalGate: {
      required: true,
      reason: "On-chain transfer requires explicit user approval and wallet signature.",
      surface: "transaction_card",
    },
    actionPreview: preview,
    addressValidation: addr,
    policy: {
      passed: policyViolations.length === 0,
      violations: policyViolations,
      guardrailSummary: ["Max single-tx % of NAV", "Gas vs amount ratio", "Daily spend caps (client risk engine)"],
    },
    transactionSimulation: sim,
  };
}

/** Client chat path — same shape as server `safetyForTransfer`. */
export function buildDemoTransferSafety(
  chain: string,
  to: string | undefined,
  amount: number,
  asset: string,
  gasUsd: number,
): AgentSafetyEnvelope {
  const addr = validateAddressForChain(chain, to);
  const violations = [...addr.errors];
  return {
    approvalGate: {
      required: true,
      reason: "Transfers require explicit confirmation in the cockpit before any wallet submission.",
      surface: "transaction_card",
    },
    actionPreview: {
      title: "Token transfer (preview)",
      steps: ["Review recipient", "Run client risk engine", "Confirm to simulate or send via WDK"],
      contracts: [],
      amounts: [{ label: "Send", value: `${amount} ${asset}` }],
    },
    addressValidation: addr,
    policy: {
      passed: violations.length === 0,
      violations,
      guardrailSummary: ["~8% USDt reserve target", "Daily spend cap (VITE_DAILY_SPEND_LIMIT_USD)"],
    },
    transactionSimulation: {
      outcome: addr.valid ? "ok" : "unknown",
      gasEstimateUsd: gasUsd,
      summary: addr.valid
        ? "Heuristic: no revert flags in model; connect WDK for live eth_estimateGas."
        : "Fix recipient before simulating.",
      method: "heuristic_model",
    },
  };
}
