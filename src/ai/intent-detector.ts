import { ClawUserIntent } from "@/ai/chat-schema";

export type ParsedClawEntities = {
  amounts: Array<{ raw: string; value: number }>;
  assets: string[];
  chains: string[];
  /** Raw notes e.g. follow-up "make it 75" */
  notes: string[];
};

export type ClawIntentDetection = {
  intent: ClawUserIntent;
  confidence: number;
  entities: ParsedClawEntities;
};

const CHAIN_ALIASES: Record<string, string> = {
  ethereum: "ethereum",
  eth: "ethereum",
  mainnet: "ethereum",
  polygon: "polygon",
  matic: "polygon",
  arbitrum: "arbitrum",
  arb: "arbitrum",
  tron: "tron",
  trx: "tron",
  solana: "solana",
  sol: "solana",
  ton: "ton",
};

function extractAmounts(text: string): ParsedClawEntities["amounts"] {
  const out: ParsedClawEntities["amounts"] = [];
  const re = /\b(\d+(?:\.\d+)?)\s*(?:usdt|usd\s*t|usd₮|xaut|btc|eth)?\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const value = Number(m[1]);
    if (Number.isFinite(value) && value > 0) out.push({ raw: m[0], value });
  }
  return out;
}

function extractChains(text: string): string[] {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,.;:!?()[\]{}'"`]+/).filter(Boolean);
  for (const w of words) {
    const n = CHAIN_ALIASES[w.replace(/[^a-z0-9]/g, "")];
    if (n) found.add(n);
  }
  if (/\bethereum\b|\bmainnet\b/i.test(text)) found.add("ethereum");
  if (/\bpolygon\b|\bmatic\b/i.test(text)) found.add("polygon");
  if (/\barbitrum\b/i.test(text)) found.add("arbitrum");
  if (/\btron\b/i.test(text)) found.add("tron");
  if (/\bsolana\b/i.test(text)) found.add("solana");
  if (/\bton\b/i.test(text)) found.add("ton");
  return [...found];
}

function extractAssets(text: string): string[] {
  const s = new Set<string>();
  const lower = text.toLowerCase();
  if (/\busdt\b|usd\s*t|usd₮/i.test(lower)) s.add("USDT");
  if (/\bxaut\b|xau\s*t/i.test(lower)) s.add("XAUt");
  if (/\bbtc\b|bitcoin\b/i.test(lower)) s.add("BTC");
  if (/\beth\b(?![a-z])|ether\b/i.test(lower)) s.add("ETH");
  return [...s];
}

/**
 * Lightweight regex + rules intent classifier (pre-LLM). Server-side pipeline may refine.
 */
export function detectClawIntent(userMessage: string): ClawIntentDetection {
  const t = userMessage.trim();
  const lower = t.toLowerCase();
  const entities: ParsedClawEntities = {
    amounts: extractAmounts(t),
    assets: extractAssets(t),
    chains: extractChains(t),
    notes: [],
  };

  if (/\b(actually|instead|correction|make it|change (it |that )?to)\b/i.test(t)) {
    entities.notes.push("User may be correcting a prior amount or target — prefer latest numbers.");
  }

  const preview = /\bpreview\b|\bsimulate\b|\bwhat if\b/i.test(lower);

  let intent: ClawUserIntent = ClawUserIntent.UNKNOWN;
  let confidence = 0.45;

  if (/\b(send|transfer|pay|wire)\b/i.test(lower) && !preview) {
    intent = ClawUserIntent.SEND_FUNDS;
    confidence = 0.84;
  } else if (/\b(how much|show portfolio|portfolio|balances?|what do i have|nav|holdings)\b/i.test(lower)) {
    intent = ClawUserIntent.SHOW_PORTFOLIO;
    confidence = 0.86;
  } else if (/\b(best yield|optimize|farm|stake|lend|aave|curve|earn|apy)\b/i.test(lower)) {
    intent = ClawUserIntent.OPTIMIZE_YIELD;
    confidence = 0.8;
  } else if (/\b(fee|fees|gas|gwei|expensive|cheap|cost to)\b/i.test(lower)) {
    intent = ClawUserIntent.EXPLAIN_GAS;
    confidence = 0.78;
  } else if (/\b(risk|safe|degen|scam|hack|exploit|liquidat)\b/i.test(lower)) {
    intent = ClawUserIntent.RISK_CHECK;
    confidence = 0.76;
  } else if (/\b(what is|explain|how does|teach me|why does|tldr)\b/i.test(lower)) {
    intent = ClawUserIntent.EXPLAIN_CONCEPT;
    confidence = 0.72;
  }

  return { intent, confidence, entities };
}
