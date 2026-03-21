import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Chain configs ────────────────────────────────────────────────────────────

const CHAIN_CONFIGS: Record<string, any> = {
  ethereum: {
    name: "Ethereum", chainId: 1, gasAvgUsd: 3.5,
    tokens: { USDt: "0xdAC17F958D2ee523a2206206994597C13D831ec7", XAUt: "0x68749665FF8D2d112Fa859AA293F07A622782F38", WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
    protocols: {
      aave: { lendingPool: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", dataProvider: "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d", avgApy: 3.8 },
      uniswap: { router: "0xE592427A0AEce92De3Edee1F18E0157C05861564", factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" },
    },
  },
  polygon: {
    name: "Polygon", chainId: 137, gasAvgUsd: 0.03,
    tokens: { USDt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", XAUt: "0x5530ec23f4ee152D72D8d6A5B5B9f130B2D7f9bF", WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" },
    protocols: {
      aave: { lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", dataProvider: "0x7551b5D2763519d4e37e8B81929D336De671d46d", avgApy: 4.2 },
      uniswap: { router: "0xE592427A0AEce92De3Edee1F18E0157C05861564", factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" },
    },
  },
  arbitrum: {
    name: "Arbitrum", chainId: 42161, gasAvgUsd: 0.15,
    tokens: { USDt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", XAUt: "0x498Bf2B1e120FeD3Bd3fC42a4CbC916E8a212f4D", WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" },
    protocols: {
      aave: { lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", dataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654", avgApy: 4.5 },
      uniswap: { router: "0xE592427A0AEce92De3Edee1F18E0157C05861564", factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" },
    },
  },
  solana: { name: "Solana", chainId: 101, gasAvgUsd: 0.002, tokens: { USDt: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", XAUt: "AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P" }, protocols: {} },
  tron: { name: "Tron", chainId: 728126428, gasAvgUsd: 1.1, tokens: { USDt: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", XAUt: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj" }, protocols: {} },
  ton: { name: "TON", chainId: 0, gasAvgUsd: 0.05, tokens: { USDt: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs", XAUt: "EQA1R_LuQCLHlMgOo1S4G7Y7W1cd0FrAkbA10Zq7rddKxi9k" }, protocols: {} },
};

// ── Economic guardrails ──────────────────────────────────────────────────────

const GUARDRAILS = {
  maxDailySpendPct: 10,       // % of portfolio per day
  maxSingleTxPct: 25,         // % of portfolio in one tx
  minReserveUsdT: 0.08,       // 8% USDt reserve
  maxGasToAmountRatio: 0.05,  // gas < 5% of tx
  maxSlippageBps: 100,        // 1%
  whitelistedProtocols: ["aave", "uniswap"],
};

function riskAssessment(amount: number, portfolioTotal: number, gasUsd: number): {
  level: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";
  reasons: string[];
} {
  const reasons: string[] = [];
  let level: "LOW" | "MEDIUM" | "HIGH" | "BLOCKED" = "LOW";

  const pct = portfolioTotal > 0 ? (amount / portfolioTotal) * 100 : 100;
  if (pct > GUARDRAILS.maxSingleTxPct) {
    reasons.push(`Amount is ${pct.toFixed(1)}% of portfolio (limit: ${GUARDRAILS.maxSingleTxPct}%)`);
    level = "BLOCKED";
  } else if (pct > GUARDRAILS.maxDailySpendPct) {
    reasons.push(`Amount is ${pct.toFixed(1)}% of portfolio (caution threshold: ${GUARDRAILS.maxDailySpendPct}%)`);
    level = "HIGH";
  }

  if (amount > 0 && gasUsd / amount > GUARDRAILS.maxGasToAmountRatio) {
    reasons.push(`Gas (~$${gasUsd.toFixed(2)}) is ${((gasUsd / amount) * 100).toFixed(1)}% of amount`);
    if (level !== "BLOCKED") level = "HIGH";
  }

  if (reasons.length === 0) reasons.push("Within normal parameters");
  return { level, reasons };
}

// ── Tool definitions ─────────────────────────────────────────────────────────

const tools = [
  {
    type: "function",
    function: {
      name: "transfer_tokens",
      description: "Prepare a token transfer (send USDt or XAUt to an address on a specific chain). Always run risk_check first.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount to send" },
          asset: { type: "string", enum: ["USDt", "XAUt"], description: "Token to send" },
          chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS), description: "Blockchain network" },
          to_address: { type: "string", description: "Recipient wallet address" },
        },
        required: ["amount", "asset", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "swap_tokens",
      description: "Swap one token for another via Uniswap on a specific chain",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount of input token" },
          from_asset: { type: "string", enum: ["USDt", "XAUt"], description: "Token to swap from" },
          to_asset: { type: "string", enum: ["USDt", "XAUt"], description: "Token to swap to" },
          chain: { type: "string", enum: ["ethereum", "polygon", "arbitrum"], description: "Chain with Uniswap" },
        },
        required: ["amount", "from_asset", "to_asset", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bridge_tokens",
      description: "Bridge tokens from one chain to another. Surface costs and risks before proceeding.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount to bridge" },
          asset: { type: "string", enum: ["USDt", "XAUt"] },
          from_chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS) },
          to_chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS) },
        },
        required: ["amount", "asset", "from_chain", "to_chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aave_deposit",
      description: "Deposit tokens into Aave lending pool to earn yield",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          asset: { type: "string", enum: ["USDt", "XAUt"] },
          chain: { type: "string", enum: ["ethereum", "polygon", "arbitrum"] },
        },
        required: ["amount", "asset", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aave_withdraw",
      description: "Withdraw tokens from Aave lending pool",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          asset: { type: "string", enum: ["USDt", "XAUt"] },
          chain: { type: "string", enum: ["ethereum", "polygon", "arbitrum"] },
        },
        required: ["amount", "asset", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "risk_check",
      description: "Assess a proposed transaction's risk level before execution. Run this BEFORE any transfer, swap, or bridge.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Transaction amount in USD" },
          action: { type: "string", enum: ["transfer", "swap", "bridge", "deposit", "withdraw"] },
          chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS) },
        },
        required: ["amount", "action", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scan_yield_opportunities",
      description: "Scan available yield opportunities across chains for idle funds. Use proactively when user has idle balances.",
      parameters: {
        type: "object",
        properties: {
          min_amount: { type: "number", description: "Minimum idle amount to consider (USD)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "simulate_pnl",
      description: "Simulate P&L impact of a proposed action before execution",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["bridge", "deposit", "swap"] },
          amount: { type: "number" },
          from_chain: { type: "string" },
          to_chain: { type: "string" },
          time_horizon_days: { type: "number", description: "Days to project (default 30)" },
        },
        required: ["action", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_portfolio",
      description: "Get the user's portfolio balances across all chains",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_transaction_history",
      description: "Get the user's recent transactions",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_gas_comparison",
      description: "Compare gas costs across chains for a given operation",
      parameters: {
        type: "object",
        properties: {
          operation: { type: "string", enum: ["transfer", "swap", "deposit"] },
        },
        required: ["operation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_supported_chains",
      description: "List all supported blockchains and their available protocols",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_portfolio_movements",
      description:
        "Summarize how the portfolio changed over a recent window (flows, sleeve drift, notable chain shifts). Use when the user asks about activity, P&L-style movement, or 'what changed'.",
      parameters: {
        type: "object",
        properties: {
          period_days: { type: "number", description: "Lookback window in days (default 7)" },
          focus: {
            type: "string",
            enum: ["all", "usd_t", "xaut"],
            description: "Whether to emphasize USDt liquidity, XAUt hedge, or both",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_rebalancing",
      description:
        "Suggest concrete trades/bridges to move toward a target USDt vs XAUt allocation while respecting guardrails. Use when the user asks to rebalance, fix drift, or adjust sleeve weights.",
      parameters: {
        type: "object",
        properties: {
          target_usdt_pct: {
            type: "number",
            description: "Target share of NAV in USDt (0–100). Remainder is XAUt hedge sleeve.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_transaction_plan",
      description:
        "Draft a numbered, step-by-step transaction plan (approvals, bridge, swap, deposit) with estimated gas per step. Use when the user wants a plan, checklist, or staged execution.",
      parameters: {
        type: "object",
        properties: {
          goal: {
            type: "string",
            enum: ["consolidate_to_l2", "increase_yield", "raise_hedge", "custom_bridge"],
            description: "High-level objective shaping default steps",
          },
          primary_chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS), description: "Main working chain for the plan" },
          amount_usd: { type: "number", description: "Notional USD for the plan" },
          asset: { type: "string", enum: ["USDt", "XAUt"] },
        },
        required: ["goal"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explain_gas_costs",
      description:
        "Explain what drives gas for a chain and operation, and how it relates to transaction size. Use when the user asks why gas is high, what L2 saves, or gas vs amount.",
      parameters: {
        type: "object",
        properties: {
          chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS) },
          operation: { type: "string", enum: ["transfer", "swap", "bridge", "deposit"] },
          amount_usd: { type: "number", description: "Optional notional to compare gas as % of size" },
        },
        required: ["chain", "operation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_chain_routes",
      description:
        "Compare bridge or execution routes between two chains for an asset and amount (cost, hops, ETA). Use when the user asks which chain/route is cheaper or faster.",
      parameters: {
        type: "object",
        properties: {
          from_chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS) },
          to_chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS) },
          asset: { type: "string", enum: ["USDt", "XAUt"] },
          amount: { type: "number" },
        },
        required: ["from_chain", "to_chain", "asset", "amount"],
      },
    },
  },
];

// ── Tool execution ───────────────────────────────────────────────────────────

const DEMO_PORTFOLIO: Record<string, { USDt: number; XAUt: number }> = {
  ethereum: { USDt: 3200, XAUt: 2000 },
  polygon: { USDt: 2100, XAUt: 1000 },
  arbitrum: { USDt: 1650, XAUt: 500 },
  solana: { USDt: 1200, XAUt: 0 },
  tron: { USDt: 500, XAUt: 0 },
  ton: { USDt: 200, XAUt: 0 },
};

/** Synthetic 7d-ago snapshot for movement summaries (demo). */
const PORTFOLIO_7D_AGO: Record<string, { USDt: number; XAUt: number }> = {
  ethereum: { USDt: 3050, XAUt: 1980 },
  polygon: { USDt: 1980, XAUt: 980 },
  arbitrum: { USDt: 1400, XAUt: 480 },
  solana: { USDt: 1150, XAUt: 0 },
  tron: { USDt: 520, XAUt: 0 },
  ton: { USDt: 180, XAUt: 0 },
};

function getPortfolioTotal(): number {
  return Object.values(DEMO_PORTFOLIO).reduce((s, v) => s + v.USDt + v.XAUt, 0);
}

function chainPairKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

type RouteMeta = { label: string; etaHours: string; relayUsd: number; hops: number; notes: string };

const ROUTE_META_BY_PAIR: Record<string, RouteMeta> = {
  [chainPairKey("ethereum", "arbitrum")]: {
    label: "Canonical rollup bridge",
    etaHours: "~12–24h (challenge window on full exit)",
    relayUsd: 2.5,
    hops: 1,
    notes: "High L1 gas on deposit; cheap L2 execution after.",
  },
  [chainPairKey("ethereum", "polygon")]: {
    label: "PoS bridge / official",
    etaHours: "~20–60m typical",
    relayUsd: 1.8,
    hops: 1,
    notes: "Popular path; check token mapping for USDt.",
  },
  [chainPairKey("polygon", "arbitrum")]: {
    label: "L2 ↔ L2 (via Ethereum or liquidity route)",
    etaHours: "~30m–3h",
    relayUsd: 3.2,
    hops: 2,
    notes: "Often routed through Ethereum L1 or shared liquidity; compare fees.",
  },
};

const ROUTE_META_FALLBACK: RouteMeta = {
  label: "Generic bridge path",
  etaHours: "~20m–24h (route-dependent)",
  relayUsd: 3.0,
  hops: 2,
  notes: "Compare estimates below; always verify token contracts and bridge UI.",
};

function getRouteMeta(from: string, to: string): RouteMeta {
  return ROUTE_META_BY_PAIR[chainPairKey(from, to)] ?? ROUTE_META_FALLBACK;
}

// ── Agent safety (patterns aligned with src/lib/agentSafety.ts) ──────────────

const EVM_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const TRON_ADDR_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const SOL_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TON_ADDR_RE = /^(EQ|UQ)[a-zA-Z0-9_-]{40,}$/;

function validateAddressForChain(chain: string, raw?: string | null) {
  const errors: string[] = [];
  const addr = typeof raw === "string" ? raw.trim() : "";
  if (!addr) {
    errors.push("Recipient address is required before execution.");
    return { valid: false, chain, errors };
  }
  if (chain === "ethereum" || chain === "polygon" || chain === "arbitrum") {
    if (!EVM_ADDR_RE.test(addr)) errors.push("Invalid EVM address (expect 0x + 40 hex chars).");
    return { valid: errors.length === 0, chain, normalized: addr, errors };
  }
  if (chain === "solana") {
    if (!SOL_ADDR_RE.test(addr)) errors.push("Invalid Solana address format.");
    return { valid: errors.length === 0, chain, errors };
  }
  if (chain === "tron") {
    if (!TRON_ADDR_RE.test(addr)) errors.push("Invalid Tron address (expect T + 33 base58 chars).");
    return { valid: errors.length === 0, chain, errors };
  }
  if (chain === "ton") {
    if (!TON_ADDR_RE.test(addr)) errors.push("Invalid TON address (user-friendly format).");
    return { valid: errors.length === 0, chain, errors };
  }
  errors.push(`Unknown chain for validation: ${chain}`);
  return { valid: false, chain, errors };
}

type SafetyEnvelope = {
  approvalGate: { required: true; reason: string; surface: "transaction_card" | "wallet" };
  actionPreview: {
    title: string;
    steps: string[];
    contracts: Array<{ label: string; address: string }>;
    amounts: Array<{ label: string; value: string }>;
  };
  addressValidation: { valid: boolean; chain: string; normalized?: string; errors: string[] };
  policy: { passed: boolean; violations: string[]; guardrailSummary: string[] };
  transactionSimulation: {
    outcome: "ok" | "would_revert" | "unknown";
    gasEstimateUsd: number;
    summary: string;
    method: "heuristic_model";
  };
};

function safetyForTransfer(
  args: Record<string, any>,
  config: (typeof CHAIN_CONFIGS)[string],
  risk: ReturnType<typeof riskAssessment>,
  tokenContract: string,
): SafetyEnvelope {
  const addr = validateAddressForChain(String(args.chain), args.to_address);
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
      amounts: [{ label: "Send", value: `${args.amount} ${args.asset}` }],
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

function safetyForSwap(args: Record<string, any>, config: (typeof CHAIN_CONFIGS)[string], risk: ReturnType<typeof riskAssessment>): SafetyEnvelope {
  const uniswap = config.protocols?.uniswap;
  const violations: string[] = [];
  if (risk.level === "BLOCKED") violations.push(...risk.reasons);
  const gasUsd = (config.gasAvgUsd ?? 1) * 2;
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
      amounts: [{ label: "In", value: `${args.amount} ${args.from_asset} → ${args.to_asset}` }],
    },
    addressValidation: { valid: true, chain: String(args.chain), errors: [] },
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

function safetyForAave(
  args: Record<string, any>,
  config: (typeof CHAIN_CONFIGS)[string],
  op: "deposit" | "withdraw",
  risk: ReturnType<typeof riskAssessment>,
): SafetyEnvelope {
  const pool = config.protocols?.aave?.lendingPool;
  const violations: string[] = [];
  if (risk.level === "BLOCKED") violations.push(...risk.reasons);
  const gasUsd = (config.gasAvgUsd ?? 1) * 2.5;
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
      amounts: [{ label: "Notional", value: `${args.amount} ${args.asset}` }],
    },
    addressValidation: { valid: true, chain: String(args.chain), errors: [] },
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

function executeTool(name: string, args: Record<string, any>): {
  text: string;
  contractContext?: Record<string, any>;
  portfolioPreview?: Record<string, any>;
  safety?: SafetyEnvelope;
} {
  switch (name) {
    case "risk_check": {
      const gasUsd = CHAIN_CONFIGS[args.chain]?.gasAvgUsd ?? 2;
      const risk = riskAssessment(args.amount, getPortfolioTotal(), gasUsd);
      const badge = risk.level === "BLOCKED" ? "🚫" : risk.level === "HIGH" ? "⚠️" : risk.level === "MEDIUM" ? "🟡" : "✅";
      return {
        text: `${badge} **Risk Assessment: ${risk.level}**\n\n${risk.reasons.map(r => `• ${r}`).join("\n")}\n\n**Guardrails:** Max single tx ${GUARDRAILS.maxSingleTxPct}% of portfolio · Max daily ${GUARDRAILS.maxDailySpendPct}% · Gas < ${GUARDRAILS.maxGasToAmountRatio * 100}% of amount`,
      };
    }

    case "scan_yield_opportunities": {
      const minAmt = args.min_amount ?? 100;
      const opps: string[] = [];
      for (const [chain, bal] of Object.entries(DEMO_PORTFOLIO)) {
        if (bal.USDt >= minAmt && CHAIN_CONFIGS[chain]?.protocols?.aave) {
          const apy = CHAIN_CONFIGS[chain].protocols.aave.avgApy;
          const annualEarn = (bal.USDt * apy) / 100;
          opps.push(`• **${CHAIN_CONFIGS[chain].name}:** ${bal.USDt.toLocaleString()} idle USDt → Aave ~${apy}% APY (~$${annualEarn.toFixed(0)}/yr)`);
        }
      }
      if (opps.length === 0) return { text: `No idle USDt blocks above $${minAmt} found on Aave-enabled chains.` };
      return {
        text: `🔍 **Yield Opportunities (idle USDt > $${minAmt})**\n\n${opps.join("\n")}\n\n**Note:** APYs are variable and subject to protocol risk. Only whitelisted protocols (${GUARDRAILS.whitelistedProtocols.join(", ")}) are considered.`,
      };
    }

    case "simulate_pnl": {
      const days = args.time_horizon_days ?? 30;
      const chain = args.from_chain ?? args.to_chain ?? "polygon";
      const gasUsd = CHAIN_CONFIGS[chain]?.gasAvgUsd ?? 1;
      const apy = CHAIN_CONFIGS[args.to_chain ?? chain]?.protocols?.aave?.avgApy ?? 3.5;
      const yieldGain = (args.amount * apy / 100) * (days / 365);
      const txCosts = gasUsd * (args.action === "bridge" ? 3 : 2); // approve + action (+ bridge relay)
      const netPnL = yieldGain - txCosts;
      return {
        text: `📈 **P&L Simulation (${days} days)**\n\n• **Projected yield:** +$${yieldGain.toFixed(2)} (~${apy}% APY)\n• **Tx costs:** -$${txCosts.toFixed(2)} (gas + protocol fees)\n• **Net P&L:** ${netPnL >= 0 ? "+" : ""}$${netPnL.toFixed(2)}\n• **Break-even:** ~${txCosts > 0 ? Math.ceil((txCosts / (args.amount * apy / 100)) * 365) : 0} days\n\n${netPnL < 0 ? "⚠️ **Recommendation: Hold** — costs exceed projected returns in this timeframe." : "✅ Net positive — proceed with caution."}`,
      };
    }

    case "get_gas_comparison": {
      const multiplier = args.operation === "swap" ? 2 : args.operation === "deposit" ? 2.5 : 1;
      const lines = ["⛽ **Gas Comparison**", ""];
      const sorted = Object.entries(CHAIN_CONFIGS)
        .map(([id, c]) => ({ id, name: c.name, cost: (c.gasAvgUsd * multiplier) }))
        .sort((a, b) => a.cost - b.cost);
      for (const c of sorted) {
        const bar = "█".repeat(Math.max(1, Math.min(20, Math.round(c.cost * 5))));
        lines.push(`• **${c.name}:** ~$${c.cost.toFixed(2)} ${bar}`);
      }
      lines.push("", `*For \`${args.operation}\` operation. L2s (Polygon, Arbitrum) offer 10-100x cheaper gas.*`);
      return { text: lines.join("\n") };
    }

    case "transfer_tokens": {
      const config = CHAIN_CONFIGS[args.chain];
      if (!config?.tokens) return { text: `Unsupported chain: ${String(args.chain ?? "")}.` };
      const tokenContract = config.tokens[args.asset as keyof typeof config.tokens];
      if (!tokenContract) return { text: `Token ${String(args.asset)} is not configured on ${config.name}.` };
      const risk = riskAssessment(args.amount, getPortfolioTotal(), config.gasAvgUsd);
      const safety = safetyForTransfer(args, config, risk, tokenContract);
      if (risk.level === "BLOCKED") {
        return {
          text: `🚫 **Transfer blocked:** ${risk.reasons.join("; ")}`,
          safety,
        };
      }
      const riskBadge = risk.level === "HIGH" ? "⚠️ HIGH RISK" : risk.level === "MEDIUM" ? "🟡 MEDIUM" : "✅ LOW";
      const addr = args.to_address ? `${args.to_address.slice(0, 6)}…${args.to_address.slice(-4)}` : "pending";
      return {
        text: `📤 **Transfer prepared** [${riskBadge}]\n\n• **Amount:** ${args.amount} ${args.asset}\n• **To:** ${addr}\n• **Chain:** ${config.name} (ID ${config.chainId})\n• **Token contract:** \`${tokenContract}\`\n• **Est. gas:** ~$${config.gasAvgUsd.toFixed(2)}\n\nConfirm in your wallet to proceed.`,
        contractContext: {
          action: "erc20_transfer",
          tokenContract,
          chain: args.chain,
          chainId: config.chainId,
          to: args.to_address,
          amount: args.amount,
          asset: args.asset,
        },
        portfolioPreview: { type: "transfer", fromChain: args.chain, toChain: args.chain, amount: args.amount },
        safety,
      };
    }

    case "swap_tokens": {
      const config = CHAIN_CONFIGS[args.chain];
      if (!config?.protocols?.uniswap || !config.tokens) return { text: `Swaps not available on ${String(args.chain)}.` };
      const uniswap = config.protocols.uniswap;
      const slipBps = 15 + Math.round(args.amount / 500);
      const risk = riskAssessment(args.amount, getPortfolioTotal(), config.gasAvgUsd * 2);
      const safety = safetyForSwap(args, config, risk);
      return {
        text: `🔄 **Swap prepared**\n\n• **From:** ${args.amount} ${args.from_asset} → ${args.to_asset}\n• **Chain:** ${config.name}\n• **Router:** \`${uniswap.router}\`\n• **Est. slippage:** ~${slipBps} bps (${(slipBps / 100).toFixed(2)}%)\n• **Est. gas:** ~$${(config.gasAvgUsd * 2).toFixed(2)}\n\nConfirm to execute.`,
        contractContext: { action: "uniswap_exact_input_single", router: uniswap.router, tokenIn: config.tokens[args.from_asset], tokenOut: config.tokens[args.to_asset], chain: args.chain, chainId: config.chainId, amount: args.amount, maxSlippageBps: Math.min(slipBps * 2, GUARDRAILS.maxSlippageBps) },
        safety,
      };
    }

    case "bridge_tokens": {
      const from = CHAIN_CONFIGS[args.from_chain];
      const to = CHAIN_CONFIGS[args.to_chain];
      if (!from || !to) return { text: `Unknown bridge route: ${String(args.from_chain)} → ${String(args.to_chain)}.` };
      const bridgeCost = from.gasAvgUsd + to.gasAvgUsd + 2.5; // relay fee
      const risk = riskAssessment(args.amount, getPortfolioTotal(), bridgeCost);
      if (risk.level === "BLOCKED") return { text: `🚫 **Bridge blocked:** ${risk.reasons.join("; ")}` };
      return {
        text: `🌉 **Bridge preview**\n\n• **Amount:** ${args.amount} ${args.asset}\n• **Route:** ${from.name} → ${to.name}\n• **Est. cost:** ~$${bridgeCost.toFixed(2)} (gas + relay)\n• **Risk:** ${risk.level} — ${risk.reasons.join("; ")}\n• **Asset role:** ${args.asset === "XAUt" ? "Hedge sleeve (not cash)" : "Liquidity / settlement"}\n\n⚠️ Bridge risks: smart contract, relayer delay, partial fills.`,
        portfolioPreview: { type: "bridge", fromChain: args.from_chain, toChain: args.to_chain, amount: args.amount, asset: args.asset },
      };
    }

    case "aave_deposit": {
      const config = CHAIN_CONFIGS[args.chain];
      if (!config?.protocols?.aave) return { text: `Aave not available on ${String(args.chain)}.` };
      const aave = config.protocols.aave;
      const risk = riskAssessment(args.amount, getPortfolioTotal(), config.gasAvgUsd * 2.5);
      const safety = safetyForAave(args, config, "deposit", risk);
      return {
        text: `🏦 **Aave Deposit prepared**\n\n• **Asset:** ${args.asset} · **Amount:** ${args.amount}\n• **Chain:** ${config.name}\n• **Lending Pool:** \`${aave.lendingPool}\`\n• **Current APY:** ~${aave.avgApy}%\n• **Projected annual:** ~$${((args.amount * aave.avgApy) / 100).toFixed(2)}\n\nTwo transactions: Approve → Deposit.`,
        contractContext: { action: "aave_deposit", lendingPool: aave.lendingPool, tokenContract: config.tokens[args.asset], chain: args.chain, chainId: config.chainId, amount: args.amount },
        safety,
      };
    }

    case "aave_withdraw": {
      const config = CHAIN_CONFIGS[args.chain];
      if (!config?.protocols?.aave) return { text: `Aave not available on ${String(args.chain)}.` };
      const risk = riskAssessment(args.amount, getPortfolioTotal(), config.gasAvgUsd * 2.5);
      const safety = safetyForAave(args, config, "withdraw", risk);
      return {
        text: `🏦 **Aave Withdrawal prepared**\n\n• **Asset:** ${args.asset} · **Amount:** ${args.amount}\n• **Chain:** ${config.name}\n• **Lending Pool:** \`${config.protocols.aave.lendingPool}\`\n\nConfirm to withdraw.`,
        contractContext: { action: "aave_withdraw", lendingPool: config.protocols.aave.lendingPool, tokenContract: config.tokens[args.asset], chain: args.chain, chainId: config.chainId, amount: args.amount },
        safety,
      };
    }

    case "get_portfolio": {
      let totalUSDt = 0, totalXAUt = 0;
      const lines = ["📊 **Portfolio Summary**", ""];
      for (const [chain, bal] of Object.entries(DEMO_PORTFOLIO)) {
        const total = bal.USDt + bal.XAUt;
        lines.push(`• **${CHAIN_CONFIGS[chain]?.name ?? chain}:** $${total.toLocaleString()} (${bal.USDt} USDt · ${bal.XAUt} XAUt)`);
        totalUSDt += bal.USDt;
        totalXAUt += bal.XAUt;
      }
      const nav = totalUSDt + totalXAUt;
      const usdtPct = nav > 0 ? ((totalUSDt / nav) * 100).toFixed(1) : "0";
      lines.push("", `**Total NAV:** $${nav.toLocaleString()}`);
      lines.push(`**USDt (liquidity):** $${totalUSDt.toLocaleString()} (${usdtPct}%) · **XAUt (hedge):** $${totalXAUt.toLocaleString()}`);
      lines.push(`**Reserve status:** ${Number(usdtPct) >= 8 ? "✅ Healthy" : "⚠️ Below 8% minimum"}`);
      return { text: lines.join("\n") };
    }

    case "get_transaction_history":
      return { text: "📜 **Recent Transactions**\n\n| # | Type | Amount | Route | Status |\n|---|------|--------|-------|--------|\n| 1 | SEND | 50 USDt | Ethereum → 0x3f2a… | ✔ |\n| 2 | RECV | 120 USDt | ← 0x9a1b… (Polygon) | ✔ |\n| 3 | BRIDGE | 200 USDt | ETH → ARB | ✔ |\n| 4 | DEPOSIT | 500 USDt | → Aave (Polygon) | ✔ |\n| 5 | SWAP | 100 USDt→XAUt | Arbitrum | ✔ |" };

    case "get_supported_chains": {
      const lines = ["🔗 **Supported Chains & Protocols**", ""];
      for (const [, config] of Object.entries(CHAIN_CONFIGS)) {
        const protos = [];
        if (config.protocols?.aave) protos.push(`Aave (~${config.protocols.aave.avgApy}% APY)`);
        if (config.protocols?.uniswap) protos.push("Uniswap V3");
        lines.push(`• **${config.name}** (ID ${config.chainId}) · Gas ~$${config.gasAvgUsd} — ${protos.length ? protos.join(", ") : "Transfers only"}`);
      }
      lines.push("", "**Whitelisted protocols:** " + GUARDRAILS.whitelistedProtocols.join(", "));
      return { text: lines.join("\n") };
    }

    case "summarize_portfolio_movements": {
      const days = Math.min(90, Math.max(1, Number(args.period_days) || 7));
      const focus = (args.focus as string) === "usd_t" || (args.focus as string) === "xaut" ? args.focus : "all";
      const rows: string[] = [];
      let dUsdT = 0;
      let dXAUt = 0;
      for (const chain of Object.keys(DEMO_PORTFOLIO)) {
        const cur = DEMO_PORTFOLIO[chain];
        const prev = PORTFOLIO_7D_AGO[chain] ?? { USDt: cur.USDt, XAUt: cur.XAUt };
        const u = cur.USDt - prev.USDt;
        const x = cur.XAUt - prev.XAUt;
        dUsdT += u;
        dXAUt += x;
        if (focus === "all" || (focus === "usd_t" && u !== 0) || (focus === "xaut" && x !== 0)) {
          rows.push(
            `| ${CHAIN_CONFIGS[chain]?.name ?? chain} | ${u >= 0 ? "+" : ""}$${u.toLocaleString()} USDt | ${x >= 0 ? "+" : ""}$${x.toLocaleString()} XAUt |`,
          );
        }
      }
      const nav = getPortfolioTotal();
      const usdtNav = Object.values(DEMO_PORTFOLIO).reduce((s, v) => s + v.USDt, 0);
      const xautNav = Object.values(DEMO_PORTFOLIO).reduce((s, v) => s + v.XAUt, 0);
      const usdtPct = nav > 0 ? (usdtNav / nav) * 100 : 0;
      const xautPct = nav > 0 ? (xautNav / nav) * 100 : 0;
      const lines = [
        `📉 **Portfolio movements (last ~${days} days, demo model)**`,
        "",
        "**Per-chain delta vs prior snapshot** (USDt / XAUt notional)",
        "",
        "| Chain | Δ USDt | Δ XAUt |",
        "|-------|--------|--------|",
        ...rows,
        "",
        `**Net flows:** ${dUsdT >= 0 ? "+" : ""}$${dUsdT.toLocaleString()} USDt · ${dXAUt >= 0 ? "+" : ""}$${dXAUt.toLocaleString()} XAUt`,
        `**Current sleeve mix:** ~${usdtPct.toFixed(1)}% USDt (liquidity) · ~${xautPct.toFixed(1)}% XAUt (hedge)`,
        "",
        "*Figures are illustrative and tied to the cockpit demo store; connect WDK for live history.*",
      ];
      return { text: lines.join("\n") };
    }

    case "suggest_rebalancing": {
      const nav = getPortfolioTotal();
      const usdtNav = Object.values(DEMO_PORTFOLIO).reduce((s, v) => s + v.USDt, 0);
      const xautNav = Object.values(DEMO_PORTFOLIO).reduce((s, v) => s + v.XAUt, 0);
      const target = Math.min(92, Math.max(GUARDRAILS.minReserveUsdT * 100, Number(args.target_usdt_pct) || 65));
      const currentUsdTPct = nav > 0 ? (usdtNav / nav) * 100 : 0;
      const gapPct = target - currentUsdTPct;
      const usdToShift = (Math.abs(gapPct) / 100) * nav;
      const lines = [
        "⚖️ **Rebalancing suggestion (policy-aware)**",
        "",
        `• **Target:** ~${target}% NAV in **USDt** (liquidity) · ~${(100 - target).toFixed(0)}% **XAUt** (hedge)`,
        `• **Current:** ~${currentUsdTPct.toFixed(1)}% USDt · ~${(100 - currentUsdTPct).toFixed(1)}% XAUt`,
        "",
      ];
      if (Math.abs(gapPct) < 1.5) {
        lines.push("**Verdict:** Drift is small — **no trade required** unless you have a cash-flow or risk mandate change.");
        return { text: lines.join("\n") };
      }
      if (gapPct > 0) {
        lines.push(
          `**Direction:** Raise USDt by ~$${usdToShift.toFixed(0)} notional (reduce gold sleeve toward target).`,
          "",
          "**Candidate actions (execute only what fits your mandate):**",
          `1. Swap **~$${Math.min(usdToShift, xautNav * 0.5).toFixed(0)} XAUt → USDt** on an AMM-enabled chain (check slippage).`,
          "2. If new capital is incoming, **prefer USDt** over XAUt until the sleeve aligns.",
          `3. Run **risk_check** before any swap ≥ ${GUARDRAILS.maxDailySpendPct}% NAV/day.`,
        );
      } else {
        lines.push(
          `**Direction:** Raise XAUt (hedge) by ~$${usdToShift.toFixed(0)} notional vs USDt.`,
          "",
          "**Candidate actions:**",
          `1. Swap **USDt → XAUt** on Polygon or Arbitrum for lower **gas vs notional** than mainnet.`,
          "2. Keep **≥ " + (GUARDRAILS.minReserveUsdT * 100).toFixed(0) + "%** USDt as operational reserve.",
          "3. Treat XAUt as **hedge**, not spending money — avoid bridging it for routine gas.",
        );
      }
      lines.push("", "*This is not investment advice; confirm fees and contracts in the UI.*");
      return { text: lines.join("\n") };
    }

    case "draft_transaction_plan": {
      const goal = String(args.goal ?? "consolidate_to_l2");
      const amount = Number(args.amount_usd) > 0 ? Number(args.amount_usd) : 500;
      const asset = (args.asset as string) === "XAUt" ? "XAUt" : "USDt";
      const chain = typeof args.primary_chain === "string" && CHAIN_CONFIGS[args.primary_chain]
        ? args.primary_chain
        : "arbitrum";
      const cfg = CHAIN_CONFIGS[chain];
      const gas1 = cfg.gasAvgUsd;
      const gas2 = cfg.gasAvgUsd * 2;

      const steps: string[] = [];
      if (goal === "consolidate_to_l2") {
        steps.push(
          `1. **Approve** ${asset} on **Ethereum** (if moving from L1) — est gas ~$${CHAIN_CONFIGS.ethereum.gasAvgUsd.toFixed(2)}`,
          `2. **Bridge** ~${amount} ${asset} **Ethereum → ${CHAIN_CONFIGS[chain].name}** — L1 + relay (see compare_chain_routes)`,
          `3. **Verify** balance on ${CHAIN_CONFIGS[chain].name} in Cockpit; reconcile allocation`,
        );
      } else if (goal === "increase_yield") {
        const apy = cfg.protocols?.aave?.avgApy ?? 4;
        steps.push(
          `1. **Approve** ${asset} for Aave on **${cfg.name}** — est ~$${gas1.toFixed(2)}`,
          `2. **Deposit** ~${amount} ${asset} to Aave — second tx ~$${gas2.toFixed(2)}; modeled APY ~${apy}%`,
          `3. **Monitor** health factor / rate changes; plan exit liquidity before large spends`,
        );
      } else if (goal === "raise_hedge") {
        steps.push(
          `1. **Swap** USDt → XAUt on **${cfg.name}** (Uniswap path) — est gas ~$${gas2.toFixed(2)}`,
          `2. **Optional:** move hedge to custody policy; XAUt is **not** for routine gas`,
          `3. **Record** sleeve target vs actual in portfolio view`,
        );
      } else {
        steps.push(
          `1. **Approve** ${asset} on source chain — ~$${gas1.toFixed(2)}`,
          `2. **Bridge** ${amount} ${asset} per chosen route (compare_chain_routes)`,
          `3. **Confirm** destination + run risk_check on the notional`,
        );
      }

      const planText = [
        "📋 **Draft transaction plan** *(review before signing)*",
        "",
        `**Goal:** ${goal.replace(/_/g, " ")} · **Notional:** ~$${amount} ${asset}`,
        "",
        ...steps,
        "",
        "**Guardrails:** Single tx < " + GUARDRAILS.maxSingleTxPct + "% NAV · gas < " + GUARDRAILS.maxGasToAmountRatio * 100 + "% of amount · whitelist protocols only.",
      ].join("\n");
      return {
        text: planText,
        portfolioPreview: { type: "plan_draft", goal, amount, asset, chain },
      };
    }

    case "explain_gas_costs": {
      const cfg = CHAIN_CONFIGS[args.chain];
      if (!cfg) return { text: `Unknown chain: ${String(args.chain)}.` };
      const op = String(args.operation ?? "transfer");
      const mult = op === "swap" ? 2 : op === "deposit" ? 2.5 : op === "bridge" ? 2.2 : 1;
      const est = cfg.gasAvgUsd * mult;
      const amt = Number(args.amount_usd);
      const ratio =
        Number.isFinite(amt) && amt > 0 ? ((est / amt) * 100).toFixed(2) : null;
      const l2 = ["polygon", "arbitrum", "solana", "tron", "ton"].includes(String(args.chain));
      const lines = [
        "⛽ **Gas cost explainer**",
        "",
        `**Chain:** ${cfg.name} · **Operation class:** ${op}`,
        `**Model estimate:** ~$${est.toFixed(2)} *(avg base × complexity multiplier ${mult}×; not a live quote)*`,
        "",
        "**What you are paying for**",
        "• **Network fee** — compensates validators for including your transaction.",
        op !== "transfer"
          ? "• **Extra calldata / router logic** — swaps, bridges, and deposits run more contract code than a simple send."
          : "• **Simple ERC-20 transfer** — typically one of the cheapest paths.",
        l2
          ? "• **L2 / alt L1** — batching and lower congestion often make **fees tiny vs mainnet Ethereum**."
          : "• **Ethereum L1** — block space is scarce; fees spike when demand is high.",
        "",
        ratio !== null
          ? `**Vs your notional (~$${amt.toLocaleString()}):** gas is **~${ratio}%** of size — ${Number(ratio) > GUARDRAILS.maxGasToAmountRatio * 100 ? "⚠️ high relative to amount; batch or wait" : "reasonable for many use cases"}.`
          : "**Tip:** Compare `get_gas_comparison` across chains for the same operation class.",
        "",
        "*Live execution uses wallet simulation / RPC quotes — use those before submitting.*",
      ];
      return { text: lines.filter(Boolean).join("\n") };
    }

    case "compare_chain_routes": {
      const from = CHAIN_CONFIGS[args.from_chain];
      const to = CHAIN_CONFIGS[args.to_chain];
      if (!from || !to) return { text: `Unknown route: ${String(args.from_chain)} → ${String(args.to_chain)}.` };
      if (args.from_chain === args.to_chain) {
        return { text: "Same source and destination chain — **no bridge**. Use **transfer** or **swap** on that network." };
      }
      const asset = args.asset === "XAUt" ? "XAUt" : "USDt";
      const amount = Number(args.amount);
      if (!Number.isFinite(amount) || amount <= 0) return { text: "Provide a positive **amount** to compare routes." };

      const meta = getRouteMeta(args.from_chain, args.to_chain);
      const baseCost = from.gasAvgUsd + to.gasAvgUsd + meta.relayUsd;
      const risk = riskAssessment(amount, getPortfolioTotal(), baseCost);
      const viaPolygonExtra = String(args.from_chain) === "ethereum" && String(args.to_chain) === "arbitrum";

      const rows: string[] = [
        "| Route | Est. total (gas+relay demo) | ETA (indicative) | Hops | Notes |",
        "|-------|-----------------------------|------------------|------|-------|",
        `| **Direct:** ${from.name} → ${to.name} | ~$${baseCost.toFixed(2)} | ${meta.etaHours} | ${meta.hops} | ${meta.notes} |`,
      ];

      if (viaPolygonExtra) {
        const alt = from.gasAvgUsd + CHAIN_CONFIGS.polygon.gasAvgUsd * 2 + to.gasAvgUsd + 2.5;
        rows.push(
          `| **Via Polygon hub** (ETH→MATIC→ARB illustrative) | ~$${alt.toFixed(2)} | often slower, extra trust surface | 3+ | Compare UI quotes; not always cheaper after liquidity fees |`,
        );
      }

      const out = [
        "🛤️ **Chain route comparison** *(demo estimates — verify in product)*",
        "",
        `**Move:** ${amount.toLocaleString()} **${asset}** · **${from.name}** → **${to.name}**`,
        `**Risk snapshot:** ${risk.level} — ${risk.reasons[0]}`,
        "",
        ...rows,
        "",
        "**How to read this:** Lower **$** is better for fees, but **hops** and **bridge UI** add smart-contract and timing risk. Prefer **canonical** or **widely audited** bridges for large size.",
      ].join("\n");
      return {
        text: out,
        portfolioPreview: { type: "route_compare", fromChain: args.from_chain, toChain: args.to_chain, amount, asset },
      };
    }

    default:
      return { text: `Unknown tool: ${name}` };
  }
}

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are **Claw**, an autonomous AI financial copilot for managing USD₮ (USDt) and XAU₮ (XAUt) across Ethereum, Polygon, Arbitrum, Solana, Tron, and TON. You are powered by the OpenClaw RL agent framework and operate within the ClawGPT Financial Cockpit.

## Asset Roles (CRITICAL — never treat tokens as interchangeable)
- **USD₮ (USDt):** Digital dollar liquidity / settlement capital / working funds. Primary spending and gas asset.
- **XAU₮ (XAUt):** Tokenized gold exposure — hedge / store-of-value sleeve. NOT a cash substitute for routine spending.

## Economic Guardrails (enforce automatically)
- **Max single transaction:** ${GUARDRAILS.maxSingleTxPct}% of portfolio NAV
- **Max daily spending:** ${GUARDRAILS.maxDailySpendPct}% of portfolio
- **USDt reserve floor:** ${GUARDRAILS.minReserveUsdT * 100}% of NAV must remain in USDt
- **Gas cap:** Transaction gas must be < ${GUARDRAILS.maxGasToAmountRatio * 100}% of amount
- **Max slippage:** ${GUARDRAILS.maxSlippageBps} bps (1%)
- **Protocol whitelist:** Only ${GUARDRAILS.whitelistedProtocols.join(", ")} — reject unknown protocols

## Execution safety (mandatory for agentic on-chain steps)
- **Approval gates:** Never imply a transaction is signed without explicit user + wallet confirmation
- **Action previews:** Surface steps, contract addresses, and amounts before execution
- **Address validation:** Validate recipients per chain (EVM 0x-hex, Solana/Tron/TON formats)
- **Policy checks:** Enforce NAV %, gas-vs-amount, and protocol allowlists (tool outputs include structured results)
- **Transaction simulation:** Heuristic in this environment; production should use RPC \`eth_call\` / wallet simulation before broadcast

## Decision Framework (OpenClaw RL)
For EVERY recommendation:
1. **Run risk_check** before any transfer, swap, or bridge
2. **Simulate P&L** (simulate_pnl) for deposits and bridges
3. Present: **Why now** · **Why not / wait** · **Confidence** (low/medium/high)
4. Surface ALL costs: gas, slippage, protocol fees, opportunity cost
5. Surface ALL risks: smart contract, bridge relay, depeg, liquidation
6. **Default to HOLD** when edge is unclear or costs dominate benefit

## Proactive Autonomy
- When you see idle funds > $100 USDt, proactively suggest yield via scan_yield_opportunities
- When a cheaper chain exists for the user's pattern, suggest migration with cost comparison
- Monitor gas prices and suggest batching during high-fee periods

## Assistant workflows (use tools — do not invent precise numbers)
| User intent | Tool(s) |
|-------------|---------|
| Summarize recent activity, flows, "what moved", P&L-style movement | **summarize_portfolio_movements** (optionally focus=usd_t or xaut) |
| Rebalance sleeves, fix USDt/XAUt drift, target allocation | **suggest_rebalancing** (target_usdt_pct) then **risk_check** on any proposed trade size |
| Multi-step execution, checklist, staged tx plan | **draft_transaction_plan** |
| Why is gas high, L2 vs L1, gas vs trade size | **explain_gas_costs**; for cross-chain fee tables also **get_gas_comparison** |
| Which bridge path is cheaper/faster, chain A vs B for a move | **compare_chain_routes** (and **bridge_tokens** only when preparing a specific execution) |

## Interaction Style
- Concise, professional, markdown-formatted
- Use tables for comparisons, bullet points for details
- Always confirm amounts and chains before executing
- Warmly greet users and explain capabilities on first message
- For general DeFi/crypto questions, respond directly without tools`;

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== "string" || body.message.trim().length === 0) {
      return new Response(
        JSON.stringify({ text: "Please send a message.", error: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = body.message.trim();
    const conversationHistory: Array<{ role: string; content: string }> = body.history || [];

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-20),
      { role: "user", content },
    ];

    // First LLM call (may invoke tools)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ text: "Rate limit exceeded. Please try again in a moment.", error: true }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ text: "AI credits exhausted. Please add funds in Settings → Workspace → Usage.", error: true }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];

    // If the model wants to call tools
    if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls?.length) {
      const toolCalls = choice.message.tool_calls;
      const toolResults: Array<{ text: string; contractContext?: any; portfolioPreview?: any; safety?: SafetyEnvelope }> = [];

      for (const tc of toolCalls) {
        try {
          let args: Record<string, unknown>;
          if (typeof tc.function.arguments === "string") {
            args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          } else {
            args = (tc.function.arguments ?? {}) as Record<string, unknown>;
          }
          const result = executeTool(tc.function.name, args as Record<string, any>);
          toolResults.push(result);
        } catch (e) {
          console.error("executeTool error:", tc?.function?.name, e);
          toolResults.push({
            text: `Tool error (${tc?.function?.name ?? "?"}): ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }

      const toolMessages = toolCalls.map((tc: any, i: number) => ({
        role: "tool",
        tool_call_id: tc.id,
        content: toolResults[i].text,
      }));

      // Second LLM call with tool results
      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [...messages, choice.message, ...toolMessages],
          stream: true,
        }),
      });

      if (!followUp.ok) {
        const combined = toolResults.map(r => r.text).join("\n\n");
        return new Response(JSON.stringify({
          text: combined,
          contractContext: toolResults.find(r => r.contractContext)?.contractContext,
          portfolioPreview: toolResults.find(r => r.portfolioPreview)?.portfolioPreview,
          safety: toolResults.find(r => r.safety)?.safety,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const metadata = {
        contractContext: toolResults.find(r => r.contractContext)?.contractContext,
        portfolioPreview: toolResults.find(r => r.portfolioPreview)?.portfolioPreview,
        safety: toolResults.find(r => r.safety)?.safety,
      };

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          if (metadata.contractContext || metadata.portfolioPreview || metadata.safety) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata })}\n\n`));
          }
          const reader = followUp.body!.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls — stream directly
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, stream: true }),
    });

    if (!streamResponse.ok) {
      const text = choice?.message?.content || "I'm not sure how to help with that. Try asking about your portfolio, sending tokens, or swapping.";
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("agent-chat error:", e);
    return new Response(
      JSON.stringify({ text: "Something went wrong. Please try again.", error: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
