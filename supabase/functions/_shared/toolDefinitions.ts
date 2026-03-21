import { SUPPORTED_CHAIN_KEYS } from "./chainConfig.ts";

const EVM_UNISWAP_CHAINS = ["ethereum", "polygon", "arbitrum"] as const;
const CHAIN_ENUM = SUPPORTED_CHAIN_KEYS;

/** OpenAI-style tool definitions for the LLM gateway. */
export const tools = [
  {
    type: "function",
    function: {
      name: "transfer_tokens",
      description:
        "Prepare a token transfer (send USDt or XAUt to an address on a specific chain). Always run risk_check first.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount to send" },
          asset: { type: "string", enum: ["USDt", "XAUt"], description: "Token to send" },
          chain: { type: "string", enum: CHAIN_ENUM, description: "Blockchain network" },
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
          chain: { type: "string", enum: [...EVM_UNISWAP_CHAINS], description: "Chain with Uniswap" },
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
          from_chain: { type: "string", enum: CHAIN_ENUM },
          to_chain: { type: "string", enum: CHAIN_ENUM },
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
          chain: { type: "string", enum: [...EVM_UNISWAP_CHAINS] },
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
          chain: { type: "string", enum: [...EVM_UNISWAP_CHAINS] },
        },
        required: ["amount", "asset", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "risk_check",
      description:
        "Assess a proposed transaction's risk level before execution. Run this BEFORE any transfer, swap, or bridge.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Transaction amount in USD" },
          action: { type: "string", enum: ["transfer", "swap", "bridge", "deposit", "withdraw"] },
          chain: { type: "string", enum: CHAIN_ENUM },
        },
        required: ["amount", "action", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scan_yield_opportunities",
      description:
        "Scan available yield opportunities across chains for idle funds. Use proactively when user has idle balances.",
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
          primary_chain: { type: "string", enum: CHAIN_ENUM, description: "Main working chain for the plan" },
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
          chain: { type: "string", enum: CHAIN_ENUM },
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
          from_chain: { type: "string", enum: CHAIN_ENUM },
          to_chain: { type: "string", enum: CHAIN_ENUM },
          asset: { type: "string", enum: ["USDt", "XAUt"] },
          amount: { type: "number" },
        },
        required: ["from_chain", "to_chain", "asset", "amount"],
      },
    },
  },
] as const;
