import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Chain configs ────────────────────────────────────────────────────────────

const CHAIN_CONFIGS: Record<string, any> = {
  ethereum: {
    name: "Ethereum", chainId: 1,
    tokens: { USDt: "0xdAC17F958D2ee523a2206206994597C13D831ec7", XAUt: "0x68749665FF8D2d112Fa859AA293F07A622782F38", WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
    protocols: {
      aave: { lendingPool: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", dataProvider: "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d" },
      uniswap: { router: "0xE592427A0AEce92De3Edee1F18E0157C05861564", factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" },
    },
  },
  polygon: {
    name: "Polygon", chainId: 137,
    tokens: { USDt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", XAUt: "0x5530ec23f4ee152D72D8d6A5B5B9f130B2D7f9bF", WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" },
    protocols: {
      aave: { lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", dataProvider: "0x7551b5D2763519d4e37e8B81929D336De671d46d" },
      uniswap: { router: "0xE592427A0AEce92De3Edee1F18E0157C05861564", factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" },
    },
  },
  arbitrum: {
    name: "Arbitrum", chainId: 42161,
    tokens: { USDt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", XAUt: "0x498Bf2B1e120FeD3Bd3fC42a4CbC916E8a212f4D", WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" },
    protocols: {
      aave: { lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", dataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654" },
      uniswap: { router: "0xE592427A0AEce92De3Edee1F18E0157C05861564", factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984" },
    },
  },
  solana: { name: "Solana", chainId: 101, tokens: { USDt: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", XAUt: "7dHbWXmci3dT8UFYWYZweBLjgyA8t8UjgNQwPc8hGj9V" }, protocols: {} },
  tron: { name: "Tron", chainId: 728126428, tokens: { USDt: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", XAUt: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj" }, protocols: {} },
};

// ── Tool definitions for the LLM ─────────────────────────────────────────────

const tools = [
  {
    type: "function",
    function: {
      name: "transfer_tokens",
      description: "Prepare a token transfer (send USDt or XAUt to an address on a specific chain)",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount to send" },
          asset: { type: "string", enum: ["USDt", "XAUt"], description: "Token to send" },
          chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS), description: "Blockchain network" },
          to_address: { type: "string", description: "Recipient wallet address" },
        },
        required: ["amount", "asset", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "swap_tokens",
      description: "Swap one token for another via Uniswap on a specific chain",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount of input token" },
          from_asset: { type: "string", enum: ["USDt", "XAUt"], description: "Token to swap from" },
          to_asset: { type: "string", enum: ["USDt", "XAUt"], description: "Token to swap to" },
          chain: { type: "string", enum: ["ethereum", "polygon", "arbitrum"], description: "Chain with Uniswap" },
        },
        required: ["amount", "from_asset", "to_asset", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bridge_tokens",
      description: "Bridge tokens from one chain to another",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount to bridge" },
          asset: { type: "string", enum: ["USDt", "XAUt"] },
          from_chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS) },
          to_chain: { type: "string", enum: Object.keys(CHAIN_CONFIGS) },
        },
        required: ["amount", "asset", "from_chain", "to_chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aave_deposit",
      description: "Deposit tokens into Aave lending pool to earn yield",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          asset: { type: "string", enum: ["USDt", "XAUt"] },
          chain: { type: "string", enum: ["ethereum", "polygon", "arbitrum"] },
        },
        required: ["amount", "asset", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aave_withdraw",
      description: "Withdraw tokens from Aave lending pool",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          asset: { type: "string", enum: ["USDt", "XAUt"] },
          chain: { type: "string", enum: ["ethereum", "polygon", "arbitrum"] },
        },
        required: ["amount", "asset", "chain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_portfolio",
      description: "Get the user's portfolio balances across all chains",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_transaction_history",
      description: "Get the user's recent transactions",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_supported_chains",
      description: "List all supported blockchains and their available protocols",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ── Tool execution ───────────────────────────────────────────────────────────

function executeTool(name: string, args: Record<string, any>): {
  text: string;
  contractContext?: Record<string, any>;
  /** Read-only preview — client does not mutate portfolio until user confirms + reconcile */
  portfolioPreview?: Record<string, any>;
} {
  switch (name) {
    case "transfer_tokens": {
      const config = CHAIN_CONFIGS[args.chain];
      if (!config?.tokens) {
        return { text: `Unsupported or unknown chain: ${String(args.chain ?? "")}.` };
      }
      const tokenContract = config.tokens[args.asset as keyof typeof config.tokens];
      if (!tokenContract) {
        return { text: `Token ${String(args.asset)} is not configured on ${config.name}.` };
      }
      const addr = args.to_address ? `${args.to_address.slice(0, 6)}…${args.to_address.slice(-4)}` : "pending";
      return {
        text: `📤 **Transfer prepared**\n\n• **Amount:** ${args.amount} ${args.asset}\n• **To:** ${addr}\n• **Chain:** ${config.name} (ID ${config.chainId})\n• **Token contract:** \`${tokenContract}\`\n• **Estimated gas:** ~$1.20\n\nConfirm in your wallet to proceed.`,
        contractContext: { action: "erc20_transfer", tokenContract, chain: args.chain, chainId: config.chainId, to: args.to_address, amount: args.amount },
        portfolioPreview: { type: "transfer", fromChain: args.chain, toChain: args.chain, amount: args.amount },
      };
    }
    case "swap_tokens": {
      const config = CHAIN_CONFIGS[args.chain];
      if (!config?.protocols?.uniswap || !config.tokens) {
        return { text: `Swaps are not available on ${String(args.chain ?? "this chain")}.` };
      }
      const uniswap = config.protocols.uniswap;
      return {
        text: `🔄 **Swap prepared**\n\n• **From:** ${args.amount} ${args.from_asset} → ${args.to_asset}\n• **Chain:** ${config.name}\n• **Router:** \`${uniswap.router}\`\n• **Token In:** \`${config.tokens[args.from_asset]}\`\n• **Token Out:** \`${config.tokens[args.to_asset]}\`\n\nConfirm to execute the swap.`,
        contractContext: { action: "uniswap_exact_input_single", router: uniswap.router, tokenIn: config.tokens[args.from_asset], tokenOut: config.tokens[args.to_asset], chain: args.chain, chainId: config.chainId, amount: args.amount },
      };
    }
    case "bridge_tokens": {
      const from = CHAIN_CONFIGS[args.from_chain];
      const to = CHAIN_CONFIGS[args.to_chain];
      if (!from || !to) {
        return { text: `Unknown bridge route: ${String(args.from_chain)} → ${String(args.to_chain)}.` };
      }
      return {
        text:
          `🌉 **Bridge preview (no state change until user confirms + reconcile)**\n\n` +
          `• **Amount:** ${args.amount} ${args.asset}\n` +
          `• **From:** ${from.name}\n` +
          `• **To:** ${to.name}\n` +
          `• **USD₮** is liquidity / settlement; **XAUt** is a hedge sleeve (not cash) — compare net benefit vs bridge + gas before acting.\n\n` +
          `Client applies allocation only when metadata sets \`applyPortfolioUpdate: true\` after confirmation.`,
        portfolioPreview: { type: "bridge", fromChain: args.from_chain, toChain: args.to_chain, amount: args.amount, asset: args.asset },
      };
    }
    case "aave_deposit": {
      const config = CHAIN_CONFIGS[args.chain];
      if (!config?.protocols?.aave || !config.tokens) {
        return { text: `Aave deposits are not configured for ${String(args.chain ?? "this chain")}.` };
      }
      const aave = config.protocols.aave;
      return {
        text: `🏦 **Aave Deposit prepared**\n\n• **Asset:** ${args.asset}\n• **Amount:** ${args.amount}\n• **Chain:** ${config.name}\n• **Lending Pool:** \`${aave.lendingPool}\`\n• **Estimated APY:** ~4.2%\n\nTwo transactions needed: Approve → Deposit.`,
        contractContext: { action: "aave_deposit", lendingPool: aave.lendingPool, tokenContract: config.tokens[args.asset], chain: args.chain, chainId: config.chainId, amount: args.amount },
      };
    }
    case "aave_withdraw": {
      const config = CHAIN_CONFIGS[args.chain];
      if (!config?.protocols?.aave || !config.tokens) {
        return { text: `Aave withdrawals are not configured for ${String(args.chain ?? "this chain")}.` };
      }
      const aave = config.protocols.aave;
      return {
        text: `🏦 **Aave Withdrawal prepared**\n\n• **Asset:** ${args.asset}\n• **Amount:** ${args.amount}\n• **Chain:** ${config.name}\n• **Lending Pool:** \`${aave.lendingPool}\`\n\nConfirm to withdraw.`,
        contractContext: { action: "aave_withdraw", lendingPool: aave.lendingPool, tokenContract: config.tokens[args.asset], chain: args.chain, chainId: config.chainId, amount: args.amount },
      };
    }
    case "get_portfolio": {
      const allocations: Record<string, number> = { ethereum: 5200, polygon: 3100, arbitrum: 2150, solana: 1200, tron: 500 };
      let total = 0;
      const lines = ["📊 **Portfolio Summary**", ""];
      for (const [chain, value] of Object.entries(allocations)) {
        lines.push(`• **${CHAIN_CONFIGS[chain].name}:** $${value.toLocaleString()}`);
        total += value;
      }
      lines.push("", `**Total:** $${total.toLocaleString()}`);
      return { text: lines.join("\n") };
    }
    case "get_transaction_history":
      return { text: "📜 **Recent Transactions**\n\n1. SENT 50 USDt → 0x3f2a… (Ethereum) ✔\n2. RECEIVED 120 USDt ← 0x9a1b… (Polygon) ✔\n3. BRIDGED 200 USDt ETH→ARB ✔\n4. DEPOSITED 500 USDt → Aave (Polygon) ✔" };
    case "get_supported_chains": {
      const lines = ["🔗 **Supported Chains**", ""];
      for (const [, config] of Object.entries(CHAIN_CONFIGS)) {
        const protos = [];
        if (config.protocols.aave) protos.push("Aave");
        if (config.protocols.uniswap) protos.push("Uniswap");
        lines.push(`• **${config.name}** (ID ${config.chainId}) — ${protos.length ? protos.join(", ") : "Transfers only"}`);
      }
      return { text: lines.join("\n") };
    }
    default:
      return { text: `Unknown tool: ${name}` };
  }
}

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Claw, an expert AI financial assistant for managing USDt and XAUt tokens across multiple blockchains (Ethereum, Polygon, Arbitrum, Solana, Tron).

Economic framing (Tether): **USD₮** is digital dollar liquidity / settlement capital. **XAUt** represents gold exposure (hedge / store-of-value sleeve), not a substitute for routine spending. Do not treat them as interchangeable “just another asset.”

Your capabilities (use the provided tools):
- **Transfer tokens**: Send USDt or XAUt to any address on any supported chain
- **Swap tokens**: Swap between USDt and XAUt via Uniswap (Ethereum, Polygon, Arbitrum only)
- **Bridge tokens**: Move tokens between chains
- **Aave DeFi**: Deposit/withdraw tokens to earn yield (Ethereum, Polygon, Arbitrum only)
- **Portfolio**: Show balances across all chains
- **Transaction history**: Show recent transactions
- **Chain info**: List supported chains and protocols

Guidelines:
- Prefer **holding** when expected improvement after fees, slippage, and liquidity impact is unclear or small
- Always surface **costs** (gas, spread/slippage, protocol fees) and **principal risks** (bridge, depeg, liquidation for leverage)
- For any recommendation, mention **why now**, **why not now**, and **confidence**; never present upside as certain
- Yield / leverage requires explicit downside and protocol counterparty risk
- Always use the appropriate tool when the user wants to perform an action
- Ask for missing parameters (amount, chain, address) before calling a tool
- Be concise and use markdown formatting
- For general questions about DeFi, crypto, or your capabilities, respond directly without tools
- When a user greets you, respond warmly and briefly explain what you can do
- Always confirm amounts and chains before executing transactions`;

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== "string" || body.message.trim().length === 0) {
      return new Response(
        JSON.stringify({ text: "Please send a message.", error: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = body.message.trim();
    const conversationHistory: Array<{ role: string; content: string }> = body.history || [];

    // Build messages array with conversation memory
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-20), // keep last 20 messages for context
      { role: "user", content },
    ];

    // First LLM call (may invoke tools)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ text: "Rate limit exceeded. Please try again in a moment.", error: true }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ text: "AI credits exhausted. Please add funds in Settings → Workspace → Usage.", error: true }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];

    // If the model wants to call tools
    if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls?.length) {
      const toolCalls = choice.message.tool_calls;
      const toolResults: Array<{ text: string; contractContext?: any; portfolioPreview?: any }> = [];

      // Execute all tool calls
      for (const tc of toolCalls) {
        try {
          let args: Record<string, unknown>;
          if (typeof tc.function.arguments === "string") {
            args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          } else {
            args = (tc.function.arguments ?? {}) as Record<string, unknown>;
          }
          const result = executeTool(tc.function.name, args as Record<string, any>);
          toolResults.push(result);
        } catch (e) {
          console.error("executeTool error:", tc?.function?.name, e);
          toolResults.push({
            text: `Tool error (${tc?.function?.name ?? "?"}): ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }

      // Build tool results into messages for a follow-up LLM call
      const toolMessages = toolCalls.map((tc: any, i: number) => ({
        role: "tool",
        tool_call_id: tc.id,
        content: toolResults[i].text,
      }));

      // Second LLM call to generate natural response incorporating tool results
      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            ...messages,
            choice.message,
            ...toolMessages,
          ],
          stream: true,
        }),
      });

      if (!followUp.ok) {
        // Fall back to raw tool output
        const combined = toolResults.map(r => r.text).join("\n\n");
        return new Response(JSON.stringify({
          text: combined,
          contractContext: toolResults.find(r => r.contractContext)?.contractContext,
          portfolioPreview: toolResults.find(r => r.portfolioPreview)?.portfolioPreview,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Stream the follow-up response, but also attach metadata
      const metadata = {
        contractContext: toolResults.find(r => r.contractContext)?.contractContext,
        portfolioPreview: toolResults.find(r => r.portfolioPreview)?.portfolioPreview,
      };

      // We need to pass metadata alongside the stream. We'll use a custom SSE format.
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Send metadata first as a special event
          if (metadata.contractContext || metadata.portfolioPreview) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata })}\n\n`));
          }
          // Then pipe through the AI stream
          const reader = followUp.body!.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream directly from the first call (non-streaming was used, so re-call with streaming)
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      // Fall back to the non-streamed response
      const text = choice?.message?.content || "I'm not sure how to help with that. Try asking about your portfolio, sending tokens, or swapping.";
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("agent-chat error:", e);
    return new Response(
      JSON.stringify({ text: "Something went wrong. Please try again.", error: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
