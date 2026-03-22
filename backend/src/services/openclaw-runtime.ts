/**
 * Spec-facing entry: “OpenClaw runtime” — reasoning + structured tool plans.
 * Implementation: `OpenClawAgent` (deterministic parser + optional OpenAI-compatible JSON planner).
 */
export { OpenClawAgent, computeIdleUsdt } from "./openclaw-agent.js";
export type { AgentProcessResult, PlanStep, UserAgentContext } from "./openclaw-agent.js";
