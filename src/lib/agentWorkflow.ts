import { z } from "zod";

/** OpenClaw-style phases: intent → plan → human review → execution → reconciliation. */
export type AgentWorkflowPhase = "intent" | "plan" | "review" | "execute" | "reconcile";

export interface AgentWorkflowEntry {
  phase: AgentWorkflowPhase;
  at: number;
  detail: string;
}

const proposedPlanSchema = z.object({
  title: z.string(),
  steps: z.array(z.string()).min(1),
  requiresOnChainConfirmation: z.boolean(),
});

export type AgentProposedPlan = z.infer<typeof proposedPlanSchema>;

export function parseProposedPlan(raw: unknown): AgentProposedPlan | null {
  const r = proposedPlanSchema.safeParse(raw);
  return r.success ? r.data : null;
}

export function appendWorkflow(
  log: AgentWorkflowEntry[],
  phase: AgentWorkflowPhase,
  detail: string,
): AgentWorkflowEntry[] {
  return [...log, { phase, at: Date.now(), detail }];
}
