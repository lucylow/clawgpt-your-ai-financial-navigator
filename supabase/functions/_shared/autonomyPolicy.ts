import type { AutonomyLevel } from "./autonomyTypes.ts";
import type { ToolAutonomyTier } from "./autonomyTypes.ts";

/** Classify tools for autonomy gating (aligned with user-facing levels 1–5). */
export function tierForTool(tool: string): ToolAutonomyTier {
  const t = tool.toLowerCase();
  if (
    t === "get_portfolio" ||
    t === "get_transaction_history" ||
    t === "get_supported_chains" ||
    t === "summarize_portfolio_movements" ||
    t === "explain_gas_costs" ||
    t === "get_gas_comparison" ||
    t === "compare_chain_routes" ||
    t === "scan_yield_opportunities" ||
    t === "suggest_rebalancing"
  ) {
    return "read";
  }
  if (t === "risk_check" || t === "simulate_pnl" || t === "draft_transaction_plan") {
    return "assessment";
  }
  if (t === "transfer_tokens" || t === "bridge_tokens" || t === "swap_tokens" || t === "aave_deposit" || t === "aave_withdraw") {
    return "preview_write";
  }
  return "read";
}

/** Minimum autonomy level required to invoke a tool (server-side guard). */
export function minAutonomyForTool(tool: string): AutonomyLevel {
  const tier = tierForTool(tool);
  if (tier === "read") return 1;
  if (tier === "assessment") return 2;
  if (tier === "preview_write") return 4;
  return 1;
}

export function autonomyAllowsTool(level: AutonomyLevel | undefined, tool: string): boolean {
  const l = level ?? 3;
  return l >= minAutonomyForTool(tool);
}
