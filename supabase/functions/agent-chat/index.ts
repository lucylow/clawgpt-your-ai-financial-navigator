import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Chain configs (mirrors src/config/contracts.ts) ──────────────────────────

interface ChainConfig {
  name: string;
  chainId: number;
  tokens: { USDt: string; XAUt: string; WETH?: string };
  protocols: {
    aave?: { lendingPool: string; dataProvider: string };
    uniswap?: { router: string; factory: string };
  };
}

const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    tokens: {
      USDt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      XAUt: "0x68749665FF8D2d112Fa859AA293F07A622782F38",
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
    protocols: {
      aave: {
        lendingPool: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
        dataProvider: "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d",
      },
      uniswap: {
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    },
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    tokens: {
      USDt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      XAUt: "0x5530ec23f4ee152D72D8d6A5B5B9f130B2D7f9bF",
      WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    },
    protocols: {
      aave: {
        lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        dataProvider: "0x7551b5D2763519d4e37e8B81929D336De671d46d",
      },
      uniswap: {
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    },
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    tokens: {
      USDt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      XAUt: "0x498Bf2B1e120FeD3Bd3fC42a4CbC916E8a212f4D",
      WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    },
    protocols: {
      aave: {
        lendingPool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        dataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      },
      uniswap: {
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      },
    },
  },
  solana: {
    name: "Solana",
    chainId: 101,
    tokens: {
      USDt: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      XAUt: "7dHbWXmci3dT8UFYWYZweBLjgyA8t8UjgNQwPc8hGj9V",
    },
    protocols: {},
  },
  tron: {
    name: "Tron",
    chainId: 728126428,
    tokens: {
      USDt: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      XAUt: "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj",
    },
    protocols: {},
  },
};

const SUPPORTED_CHAINS = Object.keys(CHAIN_CONFIGS);

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveChain(input: string): string | null {
  const lower = input.toLowerCase();
  for (const key of SUPPORTED_CHAINS) {
    if (lower.includes(key)) return key;
  }
  // aliases
  if (lower.includes("eth")) return "ethereum";
  if (lower.includes("poly")) return "polygon";
  if (lower.includes("arb")) return "arbitrum";
  if (lower.includes("sol")) return "solana";
  return null;
}

function resolveAsset(input: string): "USDt" | "XAUt" {
  if (/xaut/i.test(input)) return "XAUt";
  return "USDt";
}

function resolveAmount(input: string): number | null {
  const match = input.match(/(\d[\d,]*\.?\d*)/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(num) && num > 0 && num <= 10_000_000 ? num : null;
}

function resolveAddress(input: string): string | null {
  // EVM address
  const evmMatch = input.match(/(0x[a-fA-F0-9]{40})/);
  if (evmMatch) return evmMatch[1];
  // Tron address
  const tronMatch = input.match(/(T[1-9A-HJ-NP-Za-km-z]{33})/);
  if (tronMatch) return tronMatch[1];
  return null;
}

// ── Intent classification ────────────────────────────────────────────────────

type Intent =
  | "send"
  | "balance"
  | "swap"
  | "bridge"
  | "deposit"
  | "withdraw"
  | "history"
  | "help"
  | "chains"
  | "unknown";

function classifyIntent(text: string): Intent {
  const lower = text.toLowerCase();
  if (/\bsend\b|\btransfer\b/.test(lower)) return "send";
  if (/\bbalance\b|\bportfolio\b|\bholdings?\b/.test(lower)) return "balance";
  if (/\bswap\b|\bexchange\b/.test(lower)) return "swap";
  if (/\bbridge\b|\bmove\b/.test(lower)) return "bridge";
  if (/\bdeposit\b|\blend\b|\byield\b|\baave\b/.test(lower)) return "deposit";
  if (/\bwithdraw\b/.test(lower)) return "withdraw";
  if (/\bhistory\b|\btransaction\b|\brecent\b/.test(lower)) return "history";
  if (/\bhelp\b|\bcommand\b/.test(lower)) return "help";
  if (/\bchains?\b|\bnetwork\b|\bsupported\b/.test(lower)) return "chains";
  return "unknown";
}

// ── Intent handlers ──────────────────────────────────────────────────────────

interface AgentResult {
  text: string;
  portfolioUpdate?: Record<string, unknown>;
  contractContext?: Record<string, unknown>;
  error?: boolean;
}

function handleSend(content: string): AgentResult {
  const amount = resolveAmount(content);
  const asset = resolveAsset(content);
  const chain = resolveChain(content) ?? "ethereum";
  const address = resolveAddress(content);
  const config = CHAIN_CONFIGS[chain];

  if (!amount) {
    return {
      text: "Please specify an amount. Example: *Send 50 USDt to 0x3f2a… on Ethereum*",
      error: true,
    };
  }

  const tokenContract = config.tokens[asset];
  const displayAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "0x3f2a…";

  return {
    text: [
      `📤 **Transfer prepared**`,
      ``,
      `• **Amount:** ${amount} ${asset}`,
      `• **To:** ${displayAddress}`,
      `• **Chain:** ${config.name} (ID ${config.chainId})`,
      `• **Token contract:** \`${tokenContract}\``,
      `• **Estimated gas:** ~$1.20`,
      ``,
      `Confirm in your wallet to proceed.`,
    ].join("\n"),
    portfolioUpdate: {
      type: "transfer",
      fromChain: chain,
      toChain: chain,
      amount,
    },
    contractContext: {
      action: "erc20_transfer",
      tokenContract,
      chain,
      chainId: config.chainId,
      to: address,
      amount,
    },
  };
}

function handleBalance(): AgentResult {
  const lines = ["📊 **Portfolio Summary**", ""];
  let total = 0;
  const chainAllocations: Record<string, number> = {
    ethereum: 5200,
    polygon: 3100,
    arbitrum: 2150,
    solana: 1200,
    tron: 500,
  };

  for (const [chain, value] of Object.entries(chainAllocations)) {
    const config = CHAIN_CONFIGS[chain];
    lines.push(
      `• **${config.name}:** $${value.toLocaleString()} — USDt \`${config.tokens.USDt.slice(0, 10)}…\``
    );
    total += value;
  }

  lines.push("", `**Total:** $${total.toLocaleString()}`);
  return { text: lines.join("\n") };
}

function handleSwap(content: string): AgentResult {
  const chain = resolveChain(content) ?? "ethereum";
  const config = CHAIN_CONFIGS[chain];

  if (!config.protocols.uniswap) {
    return {
      text: `Uniswap is not available on ${config.name}. Try Ethereum, Polygon, or Arbitrum.`,
      error: true,
    };
  }

  const amount = resolveAmount(content);
  const fromAsset = resolveAsset(content);
  const toAsset = fromAsset === "USDt" ? "XAUt" : "USDt";

  if (!amount) {
    return {
      text: `🔄 Swap ready on **${config.name}**.\n\nRouter: \`${config.protocols.uniswap.router}\`\n\nExample: *Swap 100 USDt for XAUt on Ethereum*`,
    };
  }

  return {
    text: [
      `🔄 **Swap prepared**`,
      ``,
      `• **From:** ${amount} ${fromAsset} → ${toAsset}`,
      `• **Chain:** ${config.name}`,
      `• **Router:** \`${config.protocols.uniswap.router}\``,
      `• **Token In:** \`${config.tokens[fromAsset]}\``,
      `• **Token Out:** \`${config.tokens[toAsset]}\``,
      ``,
      `Confirm to execute the swap.`,
    ].join("\n"),
    contractContext: {
      action: "uniswap_exact_input_single",
      router: config.protocols.uniswap.router,
      tokenIn: config.tokens[fromAsset],
      tokenOut: config.tokens[toAsset],
      chain,
      chainId: config.chainId,
      amount,
    },
  };
}

function handleBridge(content: string): AgentResult {
  const amount = resolveAmount(content);
  const asset = resolveAsset(content);
  let fromChain = "ethereum";
  let toChain: string | null = null;

  // Try to parse "from X to Y" pattern
  const bridgeMatch = content.match(
    /(?:from\s+)?(\w+)\s+to\s+(\w+)/i
  );
  if (bridgeMatch) {
    fromChain = resolveChain(bridgeMatch[1]) ?? "ethereum";
    toChain = resolveChain(bridgeMatch[2]);
  } else {
    // Just find destination
    toChain = resolveChain(content);
    if (toChain === "ethereum") toChain = "polygon";
  }

  if (!toChain || toChain === fromChain) {
    return {
      text: [
        "🌉 **Bridge service ready**",
        "",
        "Supported routes:",
        "• Ethereum ↔ Polygon",
        "• Ethereum ↔ Arbitrum",
        "• Solana ↔ Ethereum",
        "",
        "Example: *Bridge 200 USDt from Ethereum to Polygon*",
      ].join("\n"),
    };
  }

  const fromConfig = CHAIN_CONFIGS[fromChain];
  const toConfig = CHAIN_CONFIGS[toChain];

  return {
    text: [
      `🌉 **Bridge prepared**`,
      ``,
      `• **Amount:** ${amount ?? "?"} ${asset}`,
      `• **From:** ${fromConfig.name} (${fromConfig.tokens[asset].slice(0, 10)}…)`,
      `• **To:** ${toConfig.name} (${toConfig.tokens[asset].slice(0, 10)}…)`,
      ``,
      amount ? "Confirm to initiate the bridge." : "Specify an amount to proceed.",
    ].join("\n"),
    portfolioUpdate: amount
      ? { type: "transfer", fromChain, toChain, amount }
      : undefined,
  };
}

function handleDeposit(content: string): AgentResult {
  const chain = resolveChain(content) ?? "ethereum";
  const config = CHAIN_CONFIGS[chain];
  const amount = resolveAmount(content);
  const asset = resolveAsset(content);

  if (!config.protocols.aave) {
    return {
      text: `Aave lending is not available on ${config.name}. Try Ethereum, Polygon, or Arbitrum.`,
      error: true,
    };
  }

  return {
    text: [
      `🏦 **Aave Deposit${amount ? " prepared" : ""}**`,
      ``,
      `• **Asset:** ${asset}`,
      amount ? `• **Amount:** ${amount}` : "",
      `• **Chain:** ${config.name}`,
      `• **Lending Pool:** \`${config.protocols.aave.lendingPool}\``,
      `• **Token contract:** \`${config.tokens[asset]}\``,
      ``,
      `Current estimated APY: ~4.2%`,
      ``,
      amount
        ? "Two transactions needed: Approve → Deposit. Confirm to proceed."
        : "Specify an amount to deposit.",
    ]
      .filter(Boolean)
      .join("\n"),
    contractContext: {
      action: "aave_deposit",
      lendingPool: config.protocols.aave.lendingPool,
      tokenContract: config.tokens[asset],
      chain,
      chainId: config.chainId,
      amount,
    },
  };
}

function handleWithdraw(content: string): AgentResult {
  const chain = resolveChain(content) ?? "ethereum";
  const config = CHAIN_CONFIGS[chain];
  const amount = resolveAmount(content);
  const asset = resolveAsset(content);

  if (!config.protocols.aave) {
    return {
      text: `Aave is not available on ${config.name}.`,
      error: true,
    };
  }

  return {
    text: [
      `🏦 **Aave Withdrawal${amount ? " prepared" : ""}**`,
      ``,
      `• **Asset:** ${asset}`,
      amount ? `• **Amount:** ${amount}` : "",
      `• **Chain:** ${config.name}`,
      `• **Lending Pool:** \`${config.protocols.aave.lendingPool}\``,
      ``,
      amount ? "Confirm to withdraw." : "Specify an amount to withdraw.",
    ]
      .filter(Boolean)
      .join("\n"),
    contractContext: {
      action: "aave_withdraw",
      lendingPool: config.protocols.aave.lendingPool,
      tokenContract: config.tokens[asset],
      chain,
      chainId: config.chainId,
      amount,
    },
  };
}

function handleHistory(): AgentResult {
  return {
    text: [
      "📜 **Recent Transactions**",
      "",
      "1. SENT 50 USDt → 0x3f2a… (Ethereum) ✔",
      "2. RECEIVED 120 USDt ← 0x9a1b… (Polygon) ✔",
      "3. BRIDGED 200 USDt ETH→ARB ✔",
      "4. DEPOSITED 500 USDt → Aave (Polygon) ✔",
    ].join("\n"),
  };
}

function handleHelp(): AgentResult {
  return {
    text: [
      "I can help you with:",
      "",
      '• **Check balances** – "Show my portfolio"',
      '• **Send funds** – "Send 50 USDt to 0x… on Ethereum"',
      '• **Swap tokens** – "Swap 100 USDt for XAUt on Polygon"',
      '• **Bridge assets** – "Bridge 200 USDt to Arbitrum"',
      '• **Deposit to Aave** – "Deposit 100 USDt on Ethereum"',
      '• **Withdraw from Aave** – "Withdraw 50 USDt on Polygon"',
      '• **View history** – "Show recent transactions"',
      '• **Supported chains** – "What chains are supported?"',
    ].join("\n"),
  };
}

function handleChains(): AgentResult {
  const lines = ["🔗 **Supported Chains**", ""];
  for (const [key, config] of Object.entries(CHAIN_CONFIGS)) {
    const protocols = [];
    if (config.protocols.aave) protocols.push("Aave");
    if (config.protocols.uniswap) protocols.push("Uniswap");
    lines.push(
      `• **${config.name}** (ID ${config.chainId}) — ${protocols.length ? protocols.join(", ") : "Transfers only"}`
    );
  }
  return { text: lines.join("\n") };
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body.message !== "string" || body.message.trim().length === 0) {
      return new Response(
        JSON.stringify({ text: "Please send a message.", error: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = body.message.trim();

    if (content.length > 2000) {
      return new Response(
        JSON.stringify({ text: "Message too long. Please keep it under 2000 characters.", error: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const intent = classifyIntent(content);

    let result: AgentResult;
    switch (intent) {
      case "send":
        result = handleSend(content);
        break;
      case "balance":
        result = handleBalance();
        break;
      case "swap":
        result = handleSwap(content);
        break;
      case "bridge":
        result = handleBridge(content);
        break;
      case "deposit":
        result = handleDeposit(content);
        break;
      case "withdraw":
        result = handleWithdraw(content);
        break;
      case "history":
        result = handleHistory();
        break;
      case "help":
        result = handleHelp();
        break;
      case "chains":
        result = handleChains();
        break;
      default:
        result = {
          text: "I can help with portfolio management, sending funds, swapping tokens, bridging, and DeFi deposits. Try asking me to *show your portfolio* or *send USDt*.",
        };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[agent-chat] Unhandled error:", err);
    return new Response(
      JSON.stringify({
        text: "⚠️ Something went wrong processing your request. Please try again.",
        error: true,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
