import type { ChainConfig, SafetyEnvelope } from "./types.ts";
import { validateAddressForChain } from "./addressValidation.ts";
import { GUARDRAILS, riskAssessment } from "./guardrails.ts";
import { numArg, strArg } from "./toolArgs.ts";

type Risk = ReturnType<typeof riskAssessment>;

export function safetyForTransfer(
  args: Record<string, unknown>,
  config: ChainConfig,
  risk: Risk,
  tokenContract: string,
): SafetyEnvelope {
  const chain = strArg(args, "chain");
  const amount = numArg(args, "amount");
  const asset = strArg(args, "asset");
  const rawTo = strArg(args, "to_address");
  const addr = validateAddressForChain(chain, rawTo || undefined);
  const violations: string[] = [];
  if (!addr.valid) violations.push(...addr.errors);
  if (risk.level === "BLOCKED") violations.push(...risk.reasons);
  const gasUsd = config.gasAvgUsd ?? 2;
  const simOk = addr.valid && risk.level !== "BLOCKED";
  return {
    approvalGate: {
      required: true,
      reason: "On-chain transfer requires explicit user approval and wallet signature.",
      surface: "transaction_card",
    },
    actionPreview: {
      title: "Token transfer",
      steps: [
        "Validate recipient and chain",
        "Simulate ERC-20 transfer (balance + allowance)",
        "Submit only after explicit confirmation",
      ],
      contracts: tokenContract ? [{ label: "Token", address: tokenContract }] : [],
      amounts: [{ label: "Send", value: `${amount} ${asset}` }],
    },
    addressValidation: addr,
    policy: {
      passed: violations.length === 0,
      violations,
      guardrailSummary: [
        `Max single tx ${GUARDRAILS.maxSingleTxPct}% of portfolio · Max daily ${GUARDRAILS.maxDailySpendPct}%`,
        `Gas < ${GUARDRAILS.maxGasToAmountRatio * 100}% of amount`,
      ],
    },
    transactionSimulation: {
      outcome: simOk ? "ok" : "unknown",
      gasEstimateUsd: gasUsd,
      summary: simOk
        ? "Heuristic: transfer calldata encodes ERC-20 transfer; use RPC eth_call / simulate for production."
        : "Simulation skipped — fix address or policy first.",
      method: "heuristic_model",
    },
  };
}

export function safetyForSwap(args: Record<string, unknown>, config: ChainConfig, risk: Risk): SafetyEnvelope {
  const uniswap = config.protocols?.uniswap;
  const violations: string[] = [];
  if (risk.level === "BLOCKED") violations.push(...risk.reasons);
  const gasUsd = (config.gasAvgUsd ?? 1) * 2;
  const amount = numArg(args, "amount");
  const fromAsset = strArg(args, "from_asset");
  const toAsset = strArg(args, "to_asset");
  const chain = strArg(args, "chain");
  return {
    approvalGate: {
      required: true,
      reason: "Swaps require explicit confirmation; slippage and MEV risk apply.",
      surface: "transaction_card",
    },
    actionPreview: {
      title: "DEX swap",
      steps: ["Approve router if needed", "Simulate swap route", "Confirm swap"],
      contracts: uniswap ? [{ label: "Uniswap router", address: uniswap.router }] : [],
      amounts: [{ label: "In", value: `${amount} ${fromAsset} → ${toAsset}` }],
    },
    addressValidation: { valid: true, chain, errors: [] },
    policy: {
      passed: violations.length === 0,
      violations,
      guardrailSummary: [`Max slippage ${GUARDRAILS.maxSlippageBps} bps`, `Protocols: ${GUARDRAILS.whitelistedProtocols.join(", ")}`],
    },
    transactionSimulation: {
      outcome: violations.length === 0 ? "ok" : "unknown",
      gasEstimateUsd: gasUsd,
      summary: "Heuristic swap simulation — production should quote route and simulate via RPC.",
      method: "heuristic_model",
    },
  };
}

export function safetyForAave(
  args: Record<string, unknown>,
  config: ChainConfig,
  op: "deposit" | "withdraw",
  risk: Risk,
): SafetyEnvelope {
  const pool = config.protocols?.aave?.lendingPool;
  const violations: string[] = [];
  if (risk.level === "BLOCKED") violations.push(...risk.reasons);
  const gasUsd = (config.gasAvgUsd ?? 1) * 2.5;
  const amount = numArg(args, "amount");
  const asset = strArg(args, "asset");
  const chain = strArg(args, "chain");
  return {
    approvalGate: {
      required: true,
      reason: "Lending actions require explicit confirmation (smart contract risk).",
      surface: "transaction_card",
    },
    actionPreview: {
      title: op === "deposit" ? "Aave deposit" : "Aave withdraw",
      steps: op === "deposit" ? ["Approve token", "Simulate deposit", "Confirm"] : ["Simulate withdraw", "Confirm"],
      contracts: pool ? [{ label: "Aave pool", address: pool }] : [],
      amounts: [{ label: "Notional", value: `${amount} ${asset}` }],
    },
    addressValidation: { valid: true, chain, errors: [] },
    policy: {
      passed: violations.length === 0,
      violations,
      guardrailSummary: [`Max single tx ${GUARDRAILS.maxSingleTxPct}% of portfolio`, `Protocols: ${GUARDRAILS.whitelistedProtocols.join(", ")}`],
    },
    transactionSimulation: {
      outcome: violations.length === 0 ? "ok" : "unknown",
      gasEstimateUsd: gasUsd,
      summary: "Heuristic lending simulation — production should use pool contract eth_call.",
      method: "heuristic_model",
    },
  };
}
