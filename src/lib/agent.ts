import { supabase } from "@/integrations/supabase/client";

interface AgentResponse {
  text: string;
  portfolioUpdate?: Record<string, unknown>;
  contractContext?: Record<string, unknown>;
  error?: boolean;
}

/**
 * Sends a user message to the agent-chat edge function.
 * Falls back to a local stub if the function is unreachable.
 */
export async function sendMessageToAgent(content: string): Promise<AgentResponse> {
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return { text: "I didn't catch that. Could you try again?", error: true };
  }

  try {
    const { data, error } = await supabase.functions.invoke("agent-chat", {
      body: { message: content.trim() },
    });

    if (error) {
      console.error("[Agent] Edge function error:", error);
      return fallbackHandler(content);
    }

    return data as AgentResponse;
  } catch (err) {
    console.error("[Agent] Network error, using fallback:", err);
    return fallbackHandler(content);
  }
}

// ── Local fallback (offline / edge-function unavailable) ─────────────────────

function fallbackHandler(content: string): AgentResponse {
  const lower = content.toLowerCase().trim();

  if (/\bsend\b|\btransfer\b/.test(lower)) {
    const match = content.match(/(\d+)\s*(usdt|xaut)/i);
    const amount = match ? parseInt(match[1]) : 50;
    const asset = match?.[2]?.toUpperCase() || "USDt";
    return {
      text: `Transaction prepared: ${amount} ${asset} to 0x3f2a… on Ethereum.\n\nEstimated gas: ~$1.20\nConfirm in your wallet to proceed.\n\n*⚠️ Running in offline mode*`,
      portfolioUpdate: { type: "transfer", fromChain: "ethereum", toChain: "ethereum", amount },
    };
  }

  if (/\bbalance\b|\bportfolio\b/.test(lower)) {
    return {
      text: "📊 **Portfolio Summary**\n\n• USDt: $8,240 across 4 chains\n• XAUt: 4.2 oz ($4,520)\n• Total: $12,760\n\n*⚠️ Running in offline mode*",
    };
  }

  if (/\bswap\b/.test(lower)) {
    return { text: "🔄 Swap ready. Example: *Swap 100 USDt for XAUt on Ethereum*\n\n*⚠️ Running in offline mode*" };
  }

  if (/\bbridge\b/.test(lower)) {
    return {
      text: "🌉 Bridge service ready.\n\n• Ethereum ↔ Polygon\n• Ethereum ↔ Arbitrum\n• Solana ↔ Ethereum\n\n*⚠️ Running in offline mode*",
    };
  }

  if (/\bhelp\b/.test(lower)) {
    return {
      text: 'I can help with:\n\n• **Check balances** – "Show my portfolio"\n• **Send funds** – "Send 50 USDt to 0x…"\n• **Swap tokens** – "Swap 100 USDt for XAUt"\n• **Bridge assets** – "Bridge 200 USDt to Polygon"\n• **View history** – "Show recent transactions"\n\n*⚠️ Running in offline mode*',
    };
  }

  if (/\bhistory\b|\btransaction\b/.test(lower)) {
    return {
      text: "📜 **Recent Transactions**\n\n1. SENT 50 USDt → 0x3f2a… (ETH) ✔\n2. RECEIVED 120 USDt ← 0x9a1b… (Polygon) ✔\n3. BRIDGED 200 USDt ETH→ARB ✔\n\n*⚠️ Running in offline mode*",
    };
  }

  return {
    text: "I can help with portfolio management, sending funds, swapping tokens, and bridging across chains. Try asking me to *show your portfolio* or *send USDt*.\n\n*⚠️ Running in offline mode*",
  };
}
