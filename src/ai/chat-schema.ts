import { z } from "zod";

/** High-level user intents — aligned with prompt + intent-detector. */
export const ClawUserIntent = {
  SHOW_PORTFOLIO: "SHOW_PORTFOLIO",
  SEND_FUNDS: "SEND_FUNDS",
  OPTIMIZE_YIELD: "OPTIMIZE_YIELD",
  EXPLAIN_CONCEPT: "EXPLAIN_CONCEPT",
  RISK_CHECK: "RISK_CHECK",
  EXPLAIN_GAS: "EXPLAIN_GAS",
  UNKNOWN: "UNKNOWN",
} as const;

/** Appended on parse failure and must appear in valid JSON responses. */
export const CLAW_MANDATORY_DISCLAIMER =
  "Reminder: I am an AI assistant, not a financial advisor. Double-check critical transactions and consider consulting a professional.";

export type ClawUserIntent = (typeof ClawUserIntent)[keyof typeof ClawUserIntent];

export const clawUserIntentSchema = z.enum([
  "SHOW_PORTFOLIO",
  "SEND_FUNDS",
  "OPTIMIZE_YIELD",
  "EXPLAIN_CONCEPT",
  "RISK_CHECK",
  "EXPLAIN_GAS",
  "UNKNOWN",
]);

const clawToolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Simulation vs execution — model must label honestly. */
  phase: z.enum(["simulation", "execution_preview", "explain"]),
  args: z.record(z.string(), z.unknown()).optional(),
});

export type ClawToolCall = z.infer<typeof clawToolCallSchema>;

const responseBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    body: z.string(),
  }),
  z.object({
    type: z.literal("bullets"),
    title: z.string().optional(),
    items: z.array(z.string()).min(1),
  }),
  z.object({
    type: z.literal("warning"),
    body: z.string(),
  }),
  z.object({
    type: z.literal("next_steps"),
    items: z.array(z.string()).min(1),
  }),
  z.object({
    type: z.literal("facts_vs_assumptions"),
    facts: z.array(z.string()),
    assumptions: z.array(z.string()),
  }),
]);

export type ClawResponseBlock = z.infer<typeof responseBlockSchema>;

const estimatedCostsSchema = z.object({
  gas_usd: z.number().optional(),
  slippage_risk: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

/**
 * Single JSON envelope every Claw navigator turn should return (when JSON mode is enabled).
 * The UI validates with Zod; on failure we show a graceful fallback and log raw output.
 */
export const clawChatResponseSchema = z.object({
  v: z.literal(1),
  mode: z.enum(["analysis", "action_proposal"]),
  primary_intent: clawUserIntentSchema,
  /** e.g. skill_portfolio_overview, skill_yield_scan, skill_risk_profile */
  skill_label: z.string().optional(),
  tool_calls: z.array(clawToolCallSchema).optional(),
  blocks: z.array(responseBlockSchema),
  /** action_proposal fields — required when mode is action_proposal (validated in superRefine) */
  summary: z.string().optional(),
  steps: z.array(z.string()).optional(),
  estimated_costs: estimatedCostsSchema.optional(),
  requires_confirmation: z.boolean().optional(),
  /** Separate facts (balances, config APYs) vs assumptions. */
  facts: z.array(z.string()).optional(),
  assumptions: z.array(z.string()).optional(),
  /** Mandatory footer — model must include the standard reminder or this passes validation if blocks contain disclaimer. */
  footer_disclaimer: z.string().min(1),
});

export type ClawChatResponseV1 = z.infer<typeof clawChatResponseSchema>;

export const clawChatResponseSchemaStrict = clawChatResponseSchema.superRefine((val, ctx) => {
  if (val.mode === "action_proposal") {
    if (!val.summary?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "action_proposal requires summary" });
    }
    if (!val.steps?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "action_proposal requires steps" });
    }
    if (val.requires_confirmation === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "action_proposal cannot set requires_confirmation: false for fund movement",
      });
    }
  }
});

export type ParseClawResult =
  | { ok: true; data: ClawChatResponseV1 }
  | { ok: false; error: z.ZodError; raw: string };

/** Strip optional ```json fences and parse. */
export function extractJsonPayload(raw: string): string {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) return fence[1].trim();
  return t;
}

export function parseClawChatResponse(raw: string): ParseClawResult {
  const payload = extractJsonPayload(raw);
  try {
    const parsed: unknown = JSON.parse(payload);
    const r = clawChatResponseSchemaStrict.safeParse(parsed);
    if (r.success) return { ok: true, data: r.data };
    return { ok: false, error: r.error, raw };
  } catch {
    return {
      ok: false,
      error: new z.ZodError([{ code: z.ZodIssueCode.custom, message: "Invalid JSON", path: [] }]),
      raw,
    };
  }
}

export function blocksToMarkdown(blocks: ClawResponseBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "text":
        parts.push(b.body);
        break;
      case "bullets":
        if (b.title) parts.push(`**${b.title}**`);
        parts.push(b.items.map((x) => `• ${x}`).join("\n"));
        break;
      case "warning":
        parts.push(`⚠️ **Warning:** ${b.body}`);
        break;
      case "next_steps":
        parts.push("**Next steps**\n" + b.items.map((x, i) => `${i + 1}. ${x}`).join("\n"));
        break;
      case "facts_vs_assumptions":
        parts.push(
          "**Facts**\n" + b.facts.map((x) => `• ${x}`).join("\n"),
          "**Assumptions**\n" + b.assumptions.map((x) => `• ${x}`).join("\n"),
        );
        break;
      default:
        break;
    }
  }
  return parts.filter(Boolean).join("\n\n");
}

export function clawResponseToAssistantMarkdown(data: ClawChatResponseV1): string {
  const core = blocksToMarkdown(data.blocks);
  const tail: string[] = [];
  if (data.facts?.length) {
    tail.push("**Facts:** " + data.facts.join(" "));
  }
  if (data.assumptions?.length) {
    tail.push("**Assumptions:** " + data.assumptions.join(" "));
  }
  if (data.mode === "action_proposal" && data.summary) {
    tail.unshift(`**Plan:** ${data.summary}`);
  }
  if (data.mode === "action_proposal" && data.steps?.length) {
    tail.push(data.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
  }
  if (data.estimated_costs && (data.estimated_costs.gas_usd != null || data.estimated_costs.slippage_risk)) {
    const g = data.estimated_costs.gas_usd;
    const s = data.estimated_costs.slippage_risk;
    tail.push(
      `**Estimated costs:**${g != null ? ` gas ~${g} USDT` : ""}${s ? ` · slippage risk: ${s}` : ""}`,
    );
  }
  const body = [core, ...tail].filter(Boolean).join("\n\n");
  return `${body}\n\n---\n${data.footer_disclaimer}`;
}
