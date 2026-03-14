interface AgentResponse {
  text: string;
  portfolioUpdate?: any;
  error?: boolean;
}

export async function sendMessageToAgent(content: string): Promise<AgentResponse> {
  try {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

    if (!content || typeof content !== "string") {
      return { text: "I didn't catch that. Could you try again?", error: true };
    }

    const lower = content.toLowerCase().trim();

    if (lower.includes("send")) {
      const match = content.match(/(\d+)\s*(usdt|xaut)/i);
      const amount = match ? parseInt(match[1]) : 50;
      const asset = match?.[2]?.toUpperCase() || "USDt";
      if (amount <= 0 || amount > 1_000_000) {
        return { text: `Invalid amount: ${amount}. Please enter a value between 1 and 1,000,000.`, error: true };
      }
      return {
        text: `Transaction prepared: ${amount} ${asset} to 0x3f2a... on Ethereum.\n\nEstimated gas: ~$1.20\nConfirm in your wallet to proceed.`,
        portfolioUpdate: { type: "transfer", fromChain: "ethereum", toChain: "ethereum", amount },
      };
    }

    if (lower.includes("balance") || lower.includes("portfolio")) {
      return {
        text: "📊 **Portfolio Summary**\n\n• USDt: $8,240 across 4 chains\n• XAUt: 4.2 oz ($4,520)\n• Total: $12,760\n\nEthereum holds 41% of your portfolio.",
      };
    }

    if (lower.includes("swap")) {
      return {
        text: "🔄 Ready to swap. Which tokens would you like to exchange and on which chain?\n\nExample: *Swap 100 USDt for XAUt on Ethereum*",
      };
    }

    if (lower.includes("bridge")) {
      return {
        text: "🌉 Bridge service ready. I can move assets between:\n\n• Ethereum ↔ Polygon\n• Ethereum ↔ Arbitrum\n• Solana ↔ Ethereum\n\nWhat would you like to bridge?",
      };
    }

    if (lower.includes("help")) {
      return {
        text: "I can help you with:\n\n• **Check balances** – \"Show my portfolio\"\n• **Send funds** – \"Send 50 USDt to 0x...\"\n• **Swap tokens** – \"Swap 100 USDt for XAUt\"\n• **Bridge assets** – \"Bridge 200 USDt to Polygon\"\n• **View history** – \"Show recent transactions\"",
      };
    }

    if (lower.includes("history") || lower.includes("transaction")) {
      return {
        text: "📜 **Recent Transactions**\n\n1. SENT 50 USDt → 0x3f2a... (ETH) ✔\n2. RECEIVED 120 USDt ← 0x9a1b... (Polygon) ✔\n3. BRIDGED 200 USDt ETH→ARB ✔",
      };
    }

    return {
      text: "I can help with portfolio management, sending funds, swapping tokens, and bridging across chains. Try asking me to *show your portfolio* or *send USDt*.",
    };
  } catch (error) {
    console.error("[Agent] Failed to process message:", error);
    return {
      text: "⚠️ Something went wrong processing your request. Please try again.",
      error: true,
    };
  }
}
