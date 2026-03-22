import { ClawUserIntent } from "@/ai/chat-schema";
import type { ClawIntentDetection } from "@/ai/intent-detector";

export type CriticResult = {
  score: number;
  issues: string[];
  appendNextSteps?: string;
};

function hasBulletList(s: string): boolean {
  return /(^|\n)\s*[-*•]\s/.test(s) || /^\d+\.\s/m.test(s);
}

/**
 * Cheap heuristic pass after a candidate assistant reply (no second LLM call by default).
 */
export function critiqueAssistantReply(
  text: string,
  opts: { intentHint?: ClawIntentDetection; expectBalanceGrounding?: boolean },
): CriticResult {
  const issues: string[] = [];
  let score = 1;
  const t = text.trim();

  if (t.length < 40) {
    issues.push("too_short");
    score -= 0.2;
  }

  if (!/\b(navigation|next|step|confirm|review|try|ask)\b/i.test(t) && t.length > 400) {
    issues.push("maybe_missing_next_step");
    score -= 0.1;
  }

  if (opts.expectBalanceGrounding && /\b(send|transfer|pay)\b/i.test(t)) {
    if (!/\$\d|\bUSDT\b|\bUSDt\b|\bbalance\b/i.test(t)) {
      issues.push("send_without_balance_mention");
      score -= 0.25;
    }
  }

  if (opts.intentHint?.intent === ClawUserIntent.SEND_FUNDS) {
    if (!/\b(have|balance|available|currently)\b/i.test(t)) {
      issues.push("send_intent_without_holdings");
      score -= 0.15;
    }
  }

  let appendNextSteps: string | undefined;
  if (t.length > 280 && !hasBulletList(t)) {
    issues.push("complex_without_bullets");
    score -= 0.1;
    appendNextSteps =
      "**Next steps**\n1. Confirm amounts against your live balances in the cockpit.\n2. If anything looks off, ask for a simulation-only walkthrough.\n3. Use Confirm in any action card only when you intend to sign.";
  }

  score = Math.max(0, Math.min(1, score));
  return { score, issues, appendNextSteps };
}
