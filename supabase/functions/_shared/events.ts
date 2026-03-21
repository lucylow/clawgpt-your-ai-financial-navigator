import type { AgentEventV1, ToolExecuteResult } from "./types.ts";

function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Maps tool execution to a small, stable vocabulary for the cockpit ticker / realtime layer. */
export function eventsForToolRun(
  toolName: string,
  result: ToolExecuteResult,
  correlationId: string,
): AgentEventV1[] {
  const ts = new Date().toISOString();
  const base = { v: 1 as const, correlationId, ts };

  const events: AgentEventV1[] = [
    {
      ...base,
      id: newEventId(),
      type: "agent.tool.executed",
      severity: "info",
      payload: { toolName, hasContractContext: Boolean(result.contractContext), hasSafety: Boolean(result.safety) },
    },
  ];

  if (result.transactionLifecycle?.state === "blocked") {
    events.push({
      ...base,
      id: newEventId(),
      type: "wallet.transaction.blocked",
      severity: "warning",
      payload: {
        toolName,
        reason: result.transactionLifecycle.reason,
        action: result.transactionLifecycle.action,
      },
    });
  }

  if (result.contractContext && typeof result.contractContext === "object") {
    const action = String((result.contractContext as { action?: string }).action ?? "");
    if (action === "erc20_transfer" || action === "uniswap_exact_input_single" || action.includes("aave")) {
      events.push({
        ...base,
        id: newEventId(),
        type: "wallet.transaction.previewed",
        severity: "info",
        payload: {
          action,
          chain: (result.contractContext as { chain?: string }).chain,
        },
      });
    }
  }

  if (result.safety?.approvalGate?.required) {
    events.push({
      ...base,
      id: newEventId(),
      type: "agent.confirmation.required",
      severity: "warning",
      payload: { surface: result.safety.approvalGate.surface, reason: result.safety.approvalGate.reason, toolName },
    });
  }

  return events;
}

export function mergeToolEvents(
  toolCalls: Array<{ function: { name: string } }>,
  toolResults: ToolExecuteResult[],
  correlationId: string,
): AgentEventV1[] {
  const out: AgentEventV1[] = [
    {
      v: 1,
      id: newEventId(),
      type: "agent.plan.created",
      correlationId,
      ts: new Date().toISOString(),
      severity: "info",
      payload: { toolCount: toolCalls.length, tools: toolCalls.map((t) => t.function.name) },
    },
  ];
  for (let i = 0; i < toolCalls.length; i++) {
    const name = toolCalls[i]?.function?.name ?? "?";
    const res = toolResults[i];
    if (res) out.push(...eventsForToolRun(name, res, correlationId));
  }
  return out;
}
