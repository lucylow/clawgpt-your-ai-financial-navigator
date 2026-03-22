import type { AgentChainId, MultiChainBalances } from "../lib/constants.js";
import { normalizeAssetSymbol, SUPPORTED_CHAINS } from "../lib/constants.js";

export type PlanStep = { tool: string; params: Record<string, unknown> };

export type AgentProcessResult = {
  intent: string;
  plan: PlanStep[];
  message: string;
  requiresConfirm: boolean;
  correlationId: string;
};

export type UserAgentContext = {
  defaultWalletId: string | null;
  balances: MultiChainBalances | null;
  idleUsdtHint: number;
};

/** Amount + asset token (USDt / USDT / XAU₮, etc.) */
const AMOUNT = /\b(\d+(?:\.\d+)?)\s*(USDT|USDt|XAUT|USAT|USD₮|XAU₮|USD)\b/i;

function pickChain(text: string): AgentChainId {
  const t = text.toLowerCase();
  if (/\b(polygon|matic|amoy)\b/.test(t)) return "polygon";
  if (/\barbitrum\b|\barb\b/.test(t)) return "arbitrum";
  if (/\b(solana|devnet)\b/.test(t)) return "solana";
  if (/\b(tron|shasta)\b/.test(t)) return "tron";
  if (/\bton\b/.test(t)) return "ton";
  if (/\b(sepolia|ethereum|eth)\b/.test(t)) return "ethereum";
  return "ethereum";
}

function sumUsdt(balances: MultiChainBalances | null): number {
  if (!balances) return 0;
  let s = 0;
  for (const c of SUPPORTED_CHAINS) {
    const row = balances[c];
    if (row?.USDT) s += Number.parseFloat(row.USDT) || 0;
  }
  return s;
}

function newCorrelationId(): string {
  return `agt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Demo "OpenClaw" planner: structured intents without an external RL loop.
 * Swap in a real OpenClaw / LLM JSON planner by returning from `tryLlmPlan` first.
 */
export class OpenClawAgent {
  async process(
    userId: string,
    message: string,
    context: UserAgentContext,
  ): Promise<AgentProcessResult> {
    const correlationId = newCorrelationId();
    const llm = await this.tryLlmPlan(userId, message, context, correlationId);
    if (llm) return llm;

    const text = message.trim();
    const lower = text.toLowerCase();

    if (/\b(balance|portfolio|holdings|how much)\b/i.test(lower)) {
      if (!context.defaultWalletId) {
        return {
          intent: "PORTFOLIO_VIEW",
          plan: [],
          message: "Create a wallet first (POST /api/wallets), then I can read balances.",
          requiresConfirm: false,
          correlationId,
        };
      }
      return {
        intent: "PORTFOLIO_VIEW",
        plan: [{ tool: "getPortfolio", params: { walletId: context.defaultWalletId } }],
        message: "Fetching your USD₮ / XAU₮ balances across chains.",
        requiresConfirm: false,
        correlationId,
      };
    }

    if (/\b(send|transfer|pay)\b/i.test(lower)) {
      const m = text.match(AMOUNT);
      const assetRaw = m?.[2];
      const amount = m?.[1] ?? "1";
      const sym = normalizeAssetSymbol(assetRaw ?? "USDT") ?? "USDT";

      const addrMatches = [...text.matchAll(/\b(0x[a-fA-F0-9]{40})\b/gi)];
      const toAddress = addrMatches.length ? (addrMatches[addrMatches.length - 1]?.[1] ?? "") : "";
      if (!toAddress) {
        return {
          intent: "SEND_PAYMENT",
          plan: [],
          message:
            "I can send testnet USD₮ / XAU₮ on EVM chains. Include a 0x… recipient and an amount (e.g. “Send 1 USDT to 0x… on Sepolia”).",
          requiresConfirm: false,
          correlationId,
        };
      }

      if (!context.defaultWalletId) {
        return {
          intent: "SEND_PAYMENT",
          plan: [],
          message: "No wallet on file — create one via POST /api/wallets first.",
          requiresConfirm: false,
          correlationId,
        };
      }

      const chain = pickChain(text);
      return {
        intent: "SEND_PAYMENT",
        plan: [
          {
            tool: "sendToken",
            params: {
              userId,
              walletId: context.defaultWalletId,
              chain,
              asset: sym,
              amount,
              toAddress,
              amountUsdHint: Number.parseFloat(amount),
            },
          },
        ],
        message: `Proposed: send ${amount} ${sym} on ${chain} to ${toAddress.slice(0, 10)}… — confirm to broadcast.`,
        requiresConfirm: true,
        correlationId,
      };
    }

    if (/\b(yield|aave|earn|idle|optimize)\b/i.test(lower)) {
      return {
        intent: "YIELD_OPTIMIZE",
        plan: [
          {
            tool: "rankYield",
            params: { chain: pickChain(text), asset: "USDT" },
          },
        ],
        message:
          context.idleUsdtHint > 10
            ? `You have about ${context.idleUsdtHint.toFixed(2)} USD₮ idle. I can rank testnet yield ideas (demo metadata). Confirm to log a plan.`
            : "Yield tools are available after you hold testnet USD₮. Fund your Sepolia/Amoy address from a faucet.",
        requiresConfirm: true,
        correlationId,
      };
    }

    return {
      intent: "GENERAL",
      plan: [],
      message:
        "Ask for your **portfolio**, say **send 1 USDT to 0x… on Sepolia**, or request **yield** ideas for idle USD₮.",
      requiresConfirm: false,
      correlationId,
    };
  }

  /** Optional OpenAI-compatible JSON plan — disabled by default when no API key. */
  private async tryLlmPlan(
    userId: string,
    message: string,
    context: UserAgentContext,
    correlationId: string,
  ): Promise<AgentProcessResult | null> {
    const key = process.env.AGENT_LLM_API_KEY;
    const base = process.env.AGENT_LLM_BASE_URL ?? "https://api.openai.com";
    const model = process.env.AGENT_LLM_MODEL ?? "gpt-4o-mini";
    if (!key) return null;

    const body = {
      model,
      temperature: 0.2,
      response_format: { type: "json_object" as const },
      messages: [
        {
          role: "system" as const,
          content: `You are a financial agent planner. Output JSON only:
{"intent":"string","plan":[{"tool":"getPortfolio|sendToken|rankYield","params":object}],"message":"string","requiresConfirm":boolean}
Rules: sendToken must include userId, walletId, chain (ethereum|polygon|arbitrum|solana|tron|ton), asset (USDT|USAT|XAUT), amount, toAddress, amountUsdHint.
userId=${userId}. defaultWalletId=${context.defaultWalletId}. idleUsdt=${context.idleUsdtHint}.`,
        },
        { role: "user" as const, content: message },
      ],
    };

    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        intent?: string;
        plan?: PlanStep[];
        message?: string;
        requiresConfirm?: boolean;
      };
      if (!parsed.intent || !Array.isArray(parsed.plan)) return null;
      return {
        intent: parsed.intent,
        plan: parsed.plan,
        message: parsed.message ?? "Plan ready.",
        requiresConfirm: Boolean(parsed.requiresConfirm),
        correlationId,
      };
    } catch {
      return null;
    }
  }
}

export function computeIdleUsdt(balances: MultiChainBalances | null): number {
  return sumUsdt(balances);
}
