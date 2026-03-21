import type { AgentContractV1, ExtractedEntities, IntentId, RequestKind, SessionMemoryV1, ToolPlanStep } from "./agentContract.ts";
import { CHAIN_CONFIGS, SUPPORTED_CHAIN_KEYS } from "./chainConfig.ts";
import { getPortfolioTotal } from "./demoData.ts";
import { evaluateOutboundTransferPolicy } from "./policyEngine.ts";
import type { AgentEventV1 } from "./types.ts";

const CHAIN_ALIASES: Record<string, string> = {
  eth: "ethereum",
  ethereum: "ethereum",
  mainnet: "ethereum",
  l1: "ethereum",
  polygon: "polygon",
  matic: "polygon",
  pol: "polygon",
  arbitrum: "arbitrum",
  arb: "arbitrum",
  solana: "solana",
  sol: "solana",
  tron: "tron",
  trx: "tron",
  ton: "ton",
};

const SUPPORTED_SET = new Set(SUPPORTED_CHAIN_KEYS);

function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function eventsForPipeline(contract: AgentContractV1): AgentEventV1[] {
  const ts = new Date().toISOString();
  return [
    {
      v: 1,
      id: newEventId(),
      type: "agent.pipeline.analyzed",
      correlationId: contract.correlationId,
      ts,
      severity: "info",
      payload: {
        intent: contract.intent,
        subIntent: contract.subIntent ?? null,
        requestKind: contract.requestKind,
        status: contract.status,
        confidence: contract.confidence,
        missingFields: contract.missingFields,
        requiresConfirmation: contract.requiresConfirmation,
      },
    },
  ];
}

function normalizeChainToken(w: string): string | null {
  const k = w.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (SUPPORTED_SET.has(k)) return k;
  return CHAIN_ALIASES[k] ?? null;
}

function extractChains(text: string): string[] {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  // Word-boundary style scan
  const words = lower.split(/[\s,.;:!?()[\]{}'"`]+/).filter(Boolean);
  for (const w of words) {
    const n = normalizeChainToken(w);
    if (n) found.add(n);
  }
  // Phrases
  if (/\bpolygon\b/i.test(text)) found.add("polygon");
  if (/\barbitrum\b/i.test(text)) found.add("arbitrum");
  if (/\bethereum\b|\bmainnet\b|\beth\b(?![a-z])/i.test(text)) found.add("ethereum");
  if (/\bsolana\b/i.test(text)) found.add("solana");
  if (/\btron\b/i.test(text)) found.add("tron");
  if (/\bton\b/i.test(text)) found.add("ton");
  return [...found];
}

const EVM_ADDR = /\b(0x[a-fA-F0-9]{40})\b/;
/** Loose Solana-style (32-44 base58) — flag for clarification if not EVM. */
const SOL_ADDR = /\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/;

function extractAddress(text: string): { value: string; raw: string } | undefined {
  const evm = text.match(EVM_ADDR);
  if (evm) return { value: evm[1], raw: evm[1] };
  const sol = text.match(SOL_ADDR);
  if (sol && !text.includes("0x")) return { value: sol[1], raw: sol[1] };
  return undefined;
}

function extractAmount(text: string): { value: number; raw: string; inferred: boolean } | undefined {
  // "100 USDt", "25.5 XAUt", "send 50"
  const m =
    text.match(/\b(\d+(?:\.\d+)?)\s*(?:usd[tᵗ]?|usdt|dollars?|xau[tᵗ]?|xaut|gold)?\b/i) ||
    text.match(/\b(?:send|transfer|bridge|swap|move|deposit|withdraw)\s+(\d+(?:\.\d+)?)\b/i);
  if (!m) return undefined;
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return { value, raw: m[0], inferred: false };
}

function detectAssets(text: string): Array<"USDt" | "XAUt"> {
  const out: Array<"USDt" | "XAUt"> = [];
  const u = /\b(usdt|usd\s*t|usd₮|usd_t|digital dollar|dollar\s*token)\b/i;
  const x = /\b(xaut|xau\s*t|xau_t|gold\s*token|tokenized gold)\b/i;
  if (u.test(text)) out.push("USDt");
  if (x.test(text)) out.push("XAUt");
  return [...new Set(out)];
}

function scoreIntent(message: string): { id: IntentId; confidence: number } {
  const t = message.toLowerCase();

  /** Preview / dry-run requests must win over verbs like "transfer" in the same sentence. */
  if (/\bpreview\b/i.test(t)) {
    return { id: "plan.draft_transaction", confidence: 0.88 };
  }

  if (/\b(pause|stop)\s+(all\s+)?automation/i.test(t) || /\bautomation\s+(off|paused|pause)/i.test(t)) {
    return { id: "mgmt.automation_pause", confidence: 0.9 };
  }
  if (/\bresume\s+automation/i.test(t) || /\bautomation\s+on\b/i.test(t)) {
    return { id: "mgmt.automation_resume", confidence: 0.9 };
  }
  if (/\bdaily\s+limit\b|\bspending\s+cap\b|\bset\s+a\s+limit\b/i.test(t)) {
    return { id: "mgmt.limits", confidence: 0.75 };
  }
  if (/\bcreate\s+(a\s+)?wallet\b|\bimport\s+wallet\b/i.test(t)) {
    return { id: "mgmt.wallet_create", confidence: 0.7 };
  }

  if (/\bwhy\b.*\b(risk|bridge|fee)/i.test(t) || /\bexplain\s+.*\b(risky|risk)\b/i.test(t)) {
    return { id: "info.risk_explanation", confidence: 0.8 };
  }
  if (/\b(my\s+wallet|wallet\s+address|show\s+wallet|inspect\s+wallet)\b/i.test(t)) {
    return { id: "info.wallet_details", confidence: 0.78 };
  }
  if (/\b(supported\s+chains|which\s+chains|list\s+chains)\b/i.test(t)) {
    return { id: "info.supported_chains", confidence: 0.9 };
  }
  if (/\b(supported\s+assets|which\s+tokens)\b/i.test(t)) {
    return { id: "info.supported_assets", confidence: 0.85 };
  }
  if (/\b(history|transactions?|last\s+tx|what\s+happened)\b/i.test(t)) {
    return { id: "info.transaction_history", confidence: 0.85 };
  }
  if (/\b(how\s+much|balance|balances|per\s+chain|each\s+chain|across\s+chains)\b/i.test(t) && /\b(usdt|usd|token|portfolio|hold)/i.test(t)) {
    return { id: "info.balances_by_chain", confidence: 0.85 };
  }
  if (/\b(portfolio|nav|holdings|what\s+do\s+i\s+have)\b/i.test(t)) {
    return { id: "info.portfolio_overview", confidence: 0.88 };
  }
  if (/\b(summarize|summary|daily|activity|movements?|p&l|flows)\b/i.test(t)) {
    return { id: "info.activity_summary", confidence: 0.82 };
  }
  if (/\b(gas|fee|fees|expensive|cheaper\s+route)\b/i.test(t)) {
    return { id: "info.fees_and_gas", confidence: 0.78 };
  }

  if (/\bcompare\s+(chains|routes)|cheaper\s+route|safest\s+way\s+to\s+move/i.test(t)) {
    return { id: "plan.compare_routes", confidence: 0.8 };
  }
  if (/\b(prepare|set\s+up|stage)\s+(a\s+)?(transfer|send)\b/i.test(t)) {
    return { id: "plan.prepare_transfer", confidence: 0.82 };
  }
  if (/\bdraft\s+(a\s+)?plan|transaction\s+plan|checklist|staged/i.test(t)) {
    return { id: "plan.draft_transaction", confidence: 0.78 };
  }
  if (/\b(suggest|next\s+step|what\s+should\s+i\s+do|idle)\b/i.test(t)) {
    return { id: "plan.suggest_next_step", confidence: 0.72 };
  }

  if (/\bbridge\b/i.test(t) && /\b(from|to|→|->)/i.test(t)) {
    return { id: "exec.bridge", confidence: 0.75 };
  }
  if (/\bbridge\b/i.test(t)) {
    return { id: "exec.bridge", confidence: 0.65 };
  }
  if (/\bswap\b/i.test(t) || /\bexchange\b.*\b(usdt|xaut)/i.test(t)) {
    return { id: "exec.swap", confidence: 0.72 };
  }
  if (/\bdeposit\b.*\baave\b|\baave\b.*\bdeposit/i.test(t)) {
    return { id: "exec.aave_deposit", confidence: 0.75 };
  }
  if (/\bwithdraw\b.*\baave\b|\baave\b.*\bwithdraw/i.test(t)) {
    return { id: "exec.aave_withdraw", confidence: 0.75 };
  }

  if (/\b(send|transfer)\b/i.test(t) && /\b(usdt|xaut|usd|gold|token|to)\b/i.test(t)) {
    return { id: "exec.transfer", confidence: 0.8 };
  }
  if (/\b(send|transfer)\b/i.test(t)) {
    return { id: "exec.transfer", confidence: 0.55 };
  }

  if (/\b(retry|try\s+again)\b/i.test(t)) {
    return { id: "meta.retry", confidence: 0.75 };
  }
  if (/\b(clarify|what\s+did\s+you\s+mean|you\s+misunderstood)\b/i.test(t)) {
    return { id: "meta.clarify", confidence: 0.7 };
  }
  if (/\b(status|where\s+are\s+we|what\s+are\s+you\s+doing)\b/i.test(t)) {
    return { id: "meta.status", confidence: 0.7 };
  }
  if (/\bcancel\b|\babort\b|\bforget\s+that\b/i.test(t)) {
    return { id: "meta.cancel", confidence: 0.65 };
  }
  if (/\bwhat\s+can\s+you\s+do\b|\bhow\s+does\s+this\s+work\b/i.test(t)) {
    return { id: "meta.explain_agent", confidence: 0.7 };
  }

  return { id: "unknown.general", confidence: 0.4 };
}

function intentCategory(id: IntentId): AgentContractV1["intentCategory"] {
  if (id.startsWith("info.")) return "informational";
  if (id.startsWith("plan.")) return "planning";
  if (id.startsWith("exec.")) return "execution";
  if (id.startsWith("mgmt.")) return "management";
  if (id.startsWith("meta.")) return "meta";
  return "unknown";
}

function buildEntities(message: string, memory?: SessionMemoryV1): ExtractedEntities {
  const chains = extractChains(message);
  const memChain = memory?.activeChainKey && SUPPORTED_SET.has(memory.activeChainKey) ? memory.activeChainKey : undefined;
  const chainKeys = memChain && !chains.includes(memChain) ? [...chains, memChain] : chains.length ? chains : memChain ? [memChain] : [];
  const assets = detectAssets(message);
  const amount = extractAmount(message);
  const addr = extractAddress(message);
  const previewOnly = /\bpreview\b/i.test(message) || /\bshow\s+me\s+the\s+plan\b/i.test(message);
  const rawTextNotes: string[] = [];
  if (/\bsome\b/i.test(message) && !amount) rawTextNotes.push("User said 'some' without a numeric amount.");

  return {
    chainKeys,
    assets: assets.length ? assets : [],
    amount,
    toAddress: addr,
    recipientLabel: /\b(my|the)\s+(cold|hot|savings|ledger)\s+wallet\b/i.test(message) ? "labeled_wallet" : undefined,
    previewOnly,
    rawTextNotes,
  };
}

function deriveRequestKind(
  intent: IntentId,
  entities: ExtractedEntities,
  previewOnly: boolean,
  missing: string[],
): RequestKind {
  const cat = intentCategory(intent);
  if (cat === "informational" || cat === "meta") return "informational";

  if (intent === "mgmt.automation_pause" || intent === "mgmt.automation_resume") {
    return "confirmation_required";
  }
  if (intent === "mgmt.limits" || intent === "mgmt.wallet_create") {
    return "confirmation_required";
  }

  if (cat === "planning") {
    if (
      missing.length > 0 &&
      (intent === "plan.compare_routes" || intent === "plan.prepare_transfer")
    ) {
      return "needs_clarification";
    }
    return "planning_only";
  }

  if (cat === "execution") {
    if (previewOnly) return "planning_only";
    if (missing.length > 0) return "needs_clarification";
    return "executable";
  }

  return "informational";
}

function buildToolPlan(intent: IntentId, entities: ExtractedEntities): ToolPlanStep[] {
  const steps: ToolPlanStep[] = [];
  let order = 1;

  const push = (tool: string, reason: string) => {
    steps.push({ order: order++, tool, reason });
  };

  switch (intent) {
    case "info.portfolio_overview":
      push("get_portfolio", "Summarize demo portfolio / NAV.");
      break;
    case "info.balances_by_chain":
      push("get_portfolio", "Break down balances by chain from tool data.");
      break;
    case "info.transaction_history":
      push("get_transaction_history", "List recent transactions (demo store).");
      break;
    case "info.supported_chains":
      push("get_supported_chains", "Enumerate configured chains and protocols.");
      break;
    case "info.supported_assets":
      push("get_supported_chains", "USDt/XAUt availability is tied to chain configs.");
      break;
    case "info.activity_summary":
      push("summarize_portfolio_movements", "Activity and sleeve drift (demo).");
      break;
    case "info.wallet_details":
      push("get_supported_chains", "Enumerate networks for wallet context.");
      push("get_portfolio", "Holdings from demo store — do not invent addresses.");
      break;
    case "info.fees_and_gas":
      if (entities.chainKeys[0]) {
        push("explain_gas_costs", `Explain gas for ${entities.chainKeys[0]}.`);
        push("get_gas_comparison", "Compare relative gas across chains.");
      } else {
        push("get_gas_comparison", "Compare gas for the requested operation class.");
      }
      break;
    case "info.risk_explanation":
      push("risk_check", "Anchor risk copy to policy engine / guardrails.");
      break;
    case "plan.compare_routes":
      if (entities.amount && entities.chainKeys.length >= 2) {
        push("compare_chain_routes", "Compare bridge/route economics for the stated move.");
      } else {
        push("compare_chain_routes", "User should supply amount and chains for a concrete comparison.");
      }
      break;
    case "plan.prepare_transfer":
      push("risk_check", "Policy anchor before preparing a transfer.");
      push("draft_transaction_plan", "Staged checklist — preview before execution.");
      break;
    case "plan.draft_transaction":
      push("draft_transaction_plan", "Produce a staged checklist before any execution.");
      break;
    case "plan.suggest_next_step":
      push("scan_yield_opportunities", "Surface idle USDt opportunities where applicable.");
      push("suggest_rebalancing", "Check sleeve drift vs policy.");
      break;
    case "exec.transfer":
      push("risk_check", "Required before preparing transfer.");
      push("transfer_tokens", "Build preview + safety envelope (no silent execution).");
      break;
    case "exec.bridge":
      push("risk_check", "Assess bridge notional risk.");
      push("bridge_tokens", "Preview bridge costs and risks.");
      break;
    case "exec.swap":
      push("risk_check", "Assess swap size vs NAV and gas.");
      push("swap_tokens", "Prepare swap route preview.");
      break;
    case "exec.aave_deposit":
      push("risk_check", "Assess deposit size.");
      push("aave_deposit", "Prepare deposit preview.");
      break;
    case "exec.aave_withdraw":
      push("risk_check", "Assess withdrawal size.");
      push("aave_withdraw", "Prepare withdraw preview.");
      break;
    case "mgmt.automation_pause":
    case "mgmt.automation_resume":
    case "mgmt.limits":
    case "mgmt.wallet_create":
      break;
    default:
      break;
  }

  return steps;
}

function missingFieldsForIntent(intent: IntentId, e: ExtractedEntities): string[] {
  const m: string[] = [];
  if (["exec.transfer", "exec.bridge", "exec.swap", "exec.aave_deposit", "exec.aave_withdraw"].includes(intent) && !e.amount) {
    m.push("amount");
  }
  if (intent === "exec.transfer") {
    if (!e.toAddress && !e.recipientLabel) m.push("destination");
    if (!e.chainKeys.length) m.push("chain");
    if (!e.assets.length) m.push("asset");
  }
  if (intent === "exec.bridge" && e.chainKeys.length < 2) m.push("route");
  if (intent === "plan.compare_routes" && (!e.amount || e.chainKeys.length < 2)) {
    if (!e.amount) m.push("amount");
    if (e.chainKeys.length < 2) m.push("from_and_to_chain");
  }
  if (intent === "plan.prepare_transfer") {
    if (!e.amount) m.push("amount");
    if (!e.toAddress && !e.recipientLabel) m.push("destination");
    if (!e.chainKeys.length) m.push("chain");
    if (!e.assets.length) m.push("asset");
  }
  return m;
}

function riskAndConfirmation(
  intent: IntentId,
  entities: ExtractedEntities,
  requestKind: RequestKind,
): { riskLevel: AgentContractV1["riskLevel"]; requiresConfirmation: boolean; policyHints: string[] } {
  const hints: string[] = [];
  let requiresConfirmation = requestKind === "confirmation_required" || requestKind === "executable";
  let riskLevel: AgentContractV1["riskLevel"] = "low";

  if (
    intent.startsWith("info.") ||
    intent.startsWith("meta.") ||
    requestKind === "planning_only" ||
    requestKind === "needs_clarification"
  ) {
    return {
      riskLevel: "low",
      requiresConfirmation: false,
      policyHints: [
        requestKind === "needs_clarification"
          ? "Missing fields — ask one focused question; do not call execution-class tools until resolved."
          : "Informational or planning — do not imply on-chain execution occurred.",
      ],
    };
  }

  if (intent === "mgmt.automation_pause" || intent === "mgmt.automation_resume") {
    hints.push("State-changing automation — confirm scope and duration in UI.");
    return { riskLevel: "medium", requiresConfirmation: true, policyHints: hints };
  }

  if (intent === "mgmt.limits" || intent === "mgmt.wallet_create") {
    hints.push("Wallet or policy change — confirm in product UI; do not claim it is done without user action.");
    return { riskLevel: "medium", requiresConfirmation: true, policyHints: hints };
  }

  const amount = entities.amount?.value ?? 0;
  const chain = entities.chainKeys[0] ?? "polygon";
  const gasUsd = CHAIN_CONFIGS[chain]?.gasAvgUsd ?? 2;
  const nav = getPortfolioTotal();

  if (["exec.transfer", "exec.bridge", "exec.swap"].includes(intent) && amount > 0) {
    const pol = evaluateOutboundTransferPolicy({
      amountUsd: amount,
      portfolioNavUsd: nav,
      gasUsd: intent === "exec.bridge" ? gasUsd * 2 + 2.5 : gasUsd,
      /** Treat explicit on-chain destination as needing explicit human confirmation. */
      firstTimeRecipient: Boolean(entities.toAddress),
    });
    if (pol.decision === "reject") {
      riskLevel = "blocked";
      requiresConfirmation = true;
      hints.push(...pol.reasons);
    } else if (pol.decision === "require_confirmation") {
      riskLevel = "medium";
      requiresConfirmation = true;
      hints.push(...pol.reasons);
    } else {
      riskLevel = "low";
      hints.push(...pol.reasons);
    }
  }

  if (entities.previewOnly && intent.startsWith("exec.")) {
    requiresConfirmation = false;
    hints.push("User asked for preview only — prepare but do not imply signing.");
  }

  return { riskLevel, requiresConfirmation, policyHints: hints };
}

function nextQuestion(intent: IntentId, missing: string[]): string | undefined {
  if (!missing.length) return undefined;
  if (missing.includes("amount")) return "How much (notional in USDt or XAUt) should this apply to?";
  if (missing.includes("destination")) return "What is the recipient address, or which saved wallet should I use?";
  if (missing.includes("chain")) return "Which chain should this transfer use?";
  if (missing.includes("asset")) return "Should I use USDt (liquidity) or XAUt (hedge)?";
  if (missing.includes("route") || missing.includes("from_and_to_chain")) return "Which source and destination chains should I compare or bridge between?";
  if (missing.includes("from_chain_or_to_chain")) return "Which chains are the source and destination for the bridge?";
  return "Could you specify the missing details so I can proceed safely?";
}

function summaryLine(intent: IntentId, requestKind: RequestKind): string {
  const kind =
    requestKind === "informational"
      ? "Answer in plain language; use tools for any numbers"
      : requestKind === "planning_only"
        ? "Preview or compare only — no execution implied"
        : requestKind === "needs_clarification"
          ? "Ask for missing details (clarification — not the same as confirming a transaction)"
          : requestKind === "confirmation_required"
            ? "Wait for explicit confirmation for the specified action"
            : "Complete spec — prepare preview; user must still approve in product / wallet";
  return `${kind}. Intent: ${intent}. Ground every figure in tool output; label demo vs live; separate what is known from unknown.`;
}

function deriveSubIntent(intent: IntentId, message: string): string | undefined {
  const t = message.toLowerCase();
  if (intent === "mgmt.automation_pause" && /\buntil\b|\btomorrow\b|\bfor\s+\d+/i.test(t)) return "timed_pause";
  if (intent === "exec.bridge" && /\bhub\b|\bvia\b|\bpolygon\b/i.test(t)) return "routed_bridge";
  if (intent === "info.balances_by_chain" && /\bacross\b|\ball\b/i.test(t)) return "aggregated_per_chain";
  return undefined;
}

function buildMemoryUpdates(
  intent: IntentId,
  entities: ExtractedEntities,
  sessionMemory?: SessionMemoryV1,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (entities.chainKeys.length === 1) {
    out.suggestedActiveChainKey = entities.chainKeys[0];
    if (!sessionMemory?.activeChainKey) out.activeChainKey = entities.chainKeys[0];
  }
  if (intent === "mgmt.automation_pause") out.automationPaused = true;
  if (intent === "mgmt.automation_resume") out.automationPaused = false;
  return out;
}

export type PipelineResult = {
  contract: AgentContractV1;
  telemetry: Record<string, unknown>;
  systemInjection: string;
  pipelineEvents: AgentEventV1[];
};

export function runAgentPipeline(
  message: string,
  _history: Array<{ role: string; content: string }>,
  correlationId: string,
  sessionMemory?: SessionMemoryV1,
): PipelineResult {
  const trimmed = message.trim();
  const { id: intent, confidence } = scoreIntent(trimmed);
  const entities = buildEntities(trimmed, sessionMemory);
  const missing = missingFieldsForIntent(intent, entities);
  const requestKind = deriveRequestKind(intent, entities, Boolean(entities.previewOnly), missing);
  const risk = riskAndConfirmation(intent, entities, requestKind);
  const policyHints = [...risk.policyHints];
  if (missing.length) {
    policyHints.push(`Missing: ${missing.join(", ")} — ask one focused question; do not call execution tools with guessed values.`);
  }

  const { riskLevel, requiresConfirmation } = risk;

  const status: AgentContractV1["status"] = (() => {
    if (
      missing.length > 0 &&
      (intent.startsWith("exec.") || intent === "plan.compare_routes" || intent === "plan.prepare_transfer")
    ) {
      return "awaiting_clarification";
    }
    if (requestKind === "needs_clarification") return "awaiting_clarification";
    if (requestKind === "planning_only") return "planning";
    if (
      (requestKind === "confirmation_required" || requestKind === "executable") &&
      requiresConfirmation &&
      (intent.startsWith("exec.") || intent.startsWith("mgmt."))
    ) {
      return "awaiting_confirmation";
    }
    return "understanding";
  })();

  const toolPlan = buildToolPlan(intent, entities);
  const subIntent = deriveSubIntent(intent, trimmed);
  const memoryUpdates = buildMemoryUpdates(intent, entities, sessionMemory);

  const contract: AgentContractV1 = {
    v: 1,
    intent,
    intentCategory: intentCategory(intent),
    subIntent,
    confidence,
    entities,
    assumptions: [
      "Demo portfolio and tools may differ from a connected WDK wallet — label uncertainty when applicable.",
      sessionMemory?.automationPaused ? "Session notes: automation paused." : "",
      sessionMemory?.demoMode ? "Demo mode — treat execution as simulated; onchain settlement is not claimed." : "",
      sessionMemory?.maxSingleTxUsd != null
        ? `User policy: max single outgoing leg ~$${sessionMemory.maxSingleTxUsd} USD notional — do not propose larger transfers without explicit user override.`
        : "",
      sessionMemory?.approvedChainKeys?.length
        ? `User-approved chains this session: ${sessionMemory.approvedChainKeys.join(", ")} — if a route leaves this set, explain and ask before execution tools.`
        : "",
    ].filter(Boolean),
    missingFields: missing,
    riskLevel,
    requiresConfirmation,
    requestKind,
    toolPlan,
    memoryUpdates,
    nextUserQuestion: nextQuestion(intent, missing),
    userFacingSummary: summaryLine(intent, requestKind),
    internalNotes: [
      `Derived ${missing.length ? missing.join(", ") : "no"} missing field(s).`,
      entities.previewOnly ? "Preview-only mode." : "",
    ].filter(Boolean),
    correlationId,
    status,
    policyHints,
  };

  const telemetry = {
    intent: contract.intent,
    intentCategory: contract.intentCategory,
    requestKind: contract.requestKind,
    confidence: contract.confidence,
    missingFieldCount: missing.length,
    needsClarification: contract.requestKind === "needs_clarification",
    requiresConfirmation: contract.requiresConfirmation,
    riskLevel: contract.riskLevel,
    lifecycleStatus: contract.status,
    toolPlanDepth: toolPlan.length,
  };

  const systemInjection = [
    "## Turn analysis (authoritative metadata — obey over improvisation)",
    "Use the following JSON as the source of truth for intent classification, gating, and missing fields.",
    "Never invent balances, tx hashes, confirmations, or chain support — use tools.",
    "",
    "```json",
    JSON.stringify(contract),
    "```",
  ].join("\n");

  const pipelineEvents = eventsForPipeline(contract);

  return { contract, telemetry, systemInjection, pipelineEvents };
}
