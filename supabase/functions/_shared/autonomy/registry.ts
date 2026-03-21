import type { AgentContractV1 } from "../agentContract.ts";
import { executeTool } from "../toolExecutor.ts";
import type { ToolExecuteResult } from "../types.ts";
import type { AutonomyToolResult } from "./types.ts";

function toolResultToAutonomy(name: string, res: ToolExecuteResult): AutonomyToolResult {
  if (res.transactionLifecycle?.state === "blocked") {
    return {
      success: false,
      error: res.transactionLifecycle.reason ?? `${name} blocked`,
    };
  }
  return {
    success: true,
    data: { summary: res.text, tool: name, raw: res },
  };
}

/**
 * Maps autonomy action ids → existing ClawGPT tools (WDK-safe previews; signing stays client-side).
 */
export function executeAutonomyTool(
  action: string,
  params: Record<string, unknown>,
  contract?: AgentContractV1,
): Promise<AutonomyToolResult> {
  const run = (): AutonomyToolResult => {
    switch (action) {
      case "get_balance": {
        const res = executeTool("get_portfolio", {}, contract);
        return toolResultToAutonomy("get_portfolio", res);
      }

      case "prepare_transfer": {
        return {
          success: true,
          data: { preview: "Prepared transfer", params },
        };
      }

      case "confirm_transfer": {
        return {
          success: true,
          data: { confirmed: true, note: "Confirmation step recorded (wallet approval still required for broadcast)." },
        };
      }

      case "execute_transfer": {
        const res = executeTool(
          "transfer_tokens",
          {
            chain: params.chain,
            asset: params.asset,
            amount: params.amount,
            to_address: params.to_address ?? params.to,
          },
          contract,
        );
        return toolResultToAutonomy("transfer_tokens", res);
      }

      default:
        return {
          success: false,
          error: `Unknown autonomy action: ${action}`,
        };
    }
  };

  return Promise.resolve(run());
}
