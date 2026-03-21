import { streamAgentMessage, type AgentMetadata } from "@/lib/agent";
import type { AgentPortfolioUpdate, ChatCardPayload } from "@/types";

export interface AgentClientResult {
  text: string;
  card?: ChatCardPayload;
  portfolioUpdate?: AgentPortfolioUpdate;
  intent?: string;
}

type HistoryMessage = { role: "user" | "assistant"; content: string };

function useMockAgent(): boolean {
  const flag = import.meta.env.VITE_USE_MOCK_AGENT;
  if (flag === "false") return false;
  if (flag === "true") return true;
  // Default: mock for hackathon / judge demos. Set VITE_USE_MOCK_AGENT=false to use Supabase agent-chat.
  return true;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function hashPrefix(): string {
  return "0x" + Math.random().toString(16).slice(2, 10) + "…";
}

/**
 * Rich mock responses for demos — exercises portfolio Q&A, cards, and store updates.
 */
async function mockSendMessage(content: string): Promise<AgentClientResult> {
  const q = content.toLowerCase();
  await delay(400 + Math.random() * 400);

  if (q.includes("recurring") || q.includes("dca")) {
    return {
      text: "I can set up a recurring buy. Review the plan below — you can adjust asset and frequency later when WDK is connected.",
      intent: "recurring_buy",
      card: {
        kind: "recurring_wizard",
        asset: "USDt",
        frequency: "Weekly",
        steps: [
          "Choose asset (USDt on Arbitrum)",
          "Set amount per run ($25)",
          "Confirm schedule & gas budget",
        ],
      },
    };
  }

  if (q.includes("idle") || (q.includes("arbitrum") && q.includes("move"))) {
    return {
      text: "You have **1,000 USDt** sitting on Ethereum with low utilization. Moving **800 USDt** to Arbitrum could reduce fees for upcoming trades.",
      intent: "idle_funds",
      card: {
        kind: "opportunity",
        summary: "1,000 USDt idle on Ethereum",
        suggestedAction: "Bridge 800 USDt → Arbitrum",
        fromChain: "ethereum",
        toChain: "arbitrum",
        amount: 800,
      },
    };
  }

  if (q.includes("send") && (q.includes("sarah") || q.includes("50"))) {
    return {
      text: "I've prepared a **testnet** transfer. Confirm to simulate moving **50 USDt** to Sarah's address.",
      intent: "transfer_ready",
      card: {
        kind: "transaction_ready",
        amount: 50,
        asset: "USDt",
        toLabel: "Sarah",
        chain: "ethereum",
      },
    };
  }

  if (q.includes("portfolio") || q.includes("total") || q.includes("balance")) {
    return {
      text:
        "Your **total portfolio** is aggregated in the right-hand cockpit from the live store. Ask me to simulate a transfer or bridge to see the ticker and allocation react.",
      intent: "portfolio_summary",
    };
  }

  return {
    text:
      "I'm running in **demo mode** with mocked reasoning. Try:\n- “What’s my total portfolio?”\n- “Send 50 USDT to Sarah”\n- “Set up a recurring buy”\n- “Move idle USDT to Arbitrum”",
    intent: "fallback",
  };
}

async function streamToResult(
  content: string,
  history: HistoryMessage[]
): Promise<AgentClientResult> {
  let text = "";
  let metadata: AgentMetadata | undefined;

  await new Promise<void>((resolve, reject) => {
    streamAgentMessage({
      content,
      history,
      onDelta: (t) => {
        text += t;
      },
      onMetadata: (m) => {
        metadata = m;
      },
      onDone: () => resolve(),
      onError: (e) => reject(new Error(e)),
    });
  });

  const portfolioUpdate = normalizePortfolioUpdate(metadata?.portfolioUpdate);

  return {
    text,
    portfolioUpdate,
    intent: undefined,
  };
}

function normalizePortfolioUpdate(
  raw: Record<string, unknown> | undefined
): AgentPortfolioUpdate | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const t = (raw as { type?: string }).type;
  if (t === "transfer") {
    const fromChain = String((raw as { fromChain?: string }).fromChain ?? "");
    const toChain = String((raw as { toChain?: string }).toChain ?? "");
    const amount = Number((raw as { amount?: number }).amount);
    if (!fromChain || !toChain || !Number.isFinite(amount)) return undefined;
    return { type: "transfer", fromChain, toChain, amount };
  }
  return undefined;
}

/**
 * Single entry for chat: OpenClaw / LLM / Supabase will plug in behind this API.
 */
export async function sendMessage(
  text: string,
  history: HistoryMessage[]
): Promise<AgentClientResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { text: "Ask me anything about your portfolio.", intent: "empty" };
  }

  if (useMockAgent()) {
    return mockSendMessage(trimmed);
  }

  try {
    return await streamToResult(trimmed, history);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Agent request failed.";
    return { text: `⚠️ ${msg}`, intent: "error" };
  }
}
