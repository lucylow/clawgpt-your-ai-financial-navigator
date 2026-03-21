import type { AgentContractV1 } from "./agentContract.ts";
import { CHAIN_CONFIGS, getRouteMeta } from "./chainConfig.ts";
import { DEMO_PORTFOLIO, PORTFOLIO_7D_AGO, getPortfolioTotal } from "./demoData.ts";
import { GUARDRAILS, riskAssessment } from "./guardrails.ts";
import { evaluatePolicies } from "./policy/engine.ts";
import { safetyForAave, safetyForSwap, safetyForTransfer } from "./safety.ts";
import type { ToolExecuteResult } from "./types.ts";
import type { PolicyResult } from "./policy/types.ts";
import { numArg, strArg } from "./toolArgs.ts";

/** State-changing previews — must not run while the turn contract is incomplete. */
const EXECUTION_CLASS_TOOLS = new Set([
  "transfer_tokens",
  "bridge_tokens",
  "swap_tokens",
  "aave_deposit",
  "aave_withdraw",
]);

export function guardExecutionTool(name: string, contract: AgentContractV1 | undefined): string | null {
  if (!contract || !EXECUTION_CLASS_TOOLS.has(name)) return null;
  if (contract.missingFields.length > 0 && (contract.requestKind === "needs_clarification" || contract.status === "awaiting_clarification")) {
    return `blocked until ${contract.missingFields.join(", ")} resolved`;
  }
  return null;
}

function finalizeExecutionResult(base: ToolExecuteResult, policyPr: PolicyResult | undefined): ToolExecuteResult {
  if (!policyPr?.requiresApproval) return base;
  return { ...base, policyGate: { requiresApproval: true, reason: policyPr.reason } };
}

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  contract?: AgentContractV1,
): ToolExecuteResult {
  const block = guardExecutionTool(name, contract);
  if (block) {
    return {
      text:
        `**Execution gated**\n\n${block}.\n\nUse the turn contract \`nextUserQuestion\`, or call read-only tools (portfolio, chains, history) until the user supplies missing fields.`,
    };
  }

  let policyPr: PolicyResult | undefined;
  if (EXECUTION_CLASS_TOOLS.has(name)) {
    policyPr = evaluatePolicies({
      userId: contract?.correlationId ?? "session",
      action: name,
      params: args,
      state: {},
    });
    if (!policyPr.allowed) {
      return {
        text: `**Policy blocked**\n\n${policyPr.reason ?? "This action is not allowed under current policy."}`,
        transactionLifecycle: {
          v: 1,
          state: "blocked",
          tool: name,
          reason: policyPr.reason ?? "policy",
          action: name,
        },
      };
    }
  }

  switch (name) {
    case "risk_check": {
      const chain = strArg(args, "chain");
      const amount = numArg(args, "amount");
      const gasUsd = CHAIN_CONFIGS[chain]?.gasAvgUsd ?? 2;
      const risk = riskAssessment(amount, getPortfolioTotal(), gasUsd);
      const badge = risk.level === "BLOCKED" ? "🚫" : risk.level === "HIGH" ? "⚠️" : risk.level === "MEDIUM" ? "🟡" : "✅";
      return {
        text: `${badge} **Risk Assessment: ${risk.level}**\n\n${risk.reasons.map((r) => `• ${r}`).join("\n")}\n\n**Guardrails:** Max single tx ${GUARDRAILS.maxSingleTxPct}% of portfolio · Max daily ${GUARDRAILS.maxDailySpendPct}% · Gas < ${GUARDRAILS.maxGasToAmountRatio * 100}% of amount`,
      };
    }

    case "scan_yield_opportunities": {
      const minAmt = numArg(args, "min_amount", 100);
      const opps: string[] = [];
      for (const [chain, bal] of Object.entries(DEMO_PORTFOLIO)) {
        if (bal.USDt >= minAmt && CHAIN_CONFIGS[chain]?.protocols?.aave) {
          const apy = CHAIN_CONFIGS[chain].protocols.aave!.avgApy;
          const annualEarn = (bal.USDt * apy) / 100;
          opps.push(
            `• **${CHAIN_CONFIGS[chain].name}:** ${bal.USDt.toLocaleString()} idle USDt → Aave ~${apy}% APY (~$${annualEarn.toFixed(0)}/yr)`,
          );
        }
      }
      if (opps.length === 0) return { text: `No idle USDt blocks above $${minAmt} found on Aave-enabled chains.` };
      return {
        text: `🔍 **Yield Opportunities (idle USDt > $${minAmt})**\n\n${opps.join("\n")}\n\n**Note:** APYs are variable and subject to protocol risk. Only whitelisted protocols (${GUARDRAILS.whitelistedProtocols.join(", ")}) are considered.`,
      };
    }

    case "simulate_pnl": {
      const days = numArg(args, "time_horizon_days", 30);
      const chain = strArg(args, "from_chain") || strArg(args, "to_chain") || "polygon";
      const gasUsd = CHAIN_CONFIGS[chain]?.gasAvgUsd ?? 1;
      const toChainKey = strArg(args, "to_chain") || chain;
      const apy = CHAIN_CONFIGS[toChainKey]?.protocols?.aave?.avgApy ?? 3.5;
      const amount = numArg(args, "amount");
      const yieldGain = ((amount * apy) / 100) * (days / 365);
      const txCosts = gasUsd * (strArg(args, "action") === "bridge" ? 3 : 2);
      const netPnL = yieldGain - txCosts;
      const denom = (amount * apy) / 100;
      return {
        text: `📈 **P&L Simulation (${days} days)**\n\n• **Projected yield:** +$${yieldGain.toFixed(2)} (~${apy}% APY)\n• **Tx costs:** -$${txCosts.toFixed(2)} (gas + protocol fees)\n• **Net P&L:** ${netPnL >= 0 ? "+" : ""}$${netPnL.toFixed(2)}\n• **Break-even:** ~${txCosts > 0 && denom > 0 ? Math.ceil((txCosts / denom) * 365) : 0} days\n\n${netPnL < 0 ? "⚠️ **Recommendation: Hold** — costs exceed projected returns in this timeframe." : "✅ Net positive — proceed with caution."}`,
      };
    }

    case "get_gas_comparison": {
      const op = strArg(args, "operation");
      const multiplier = op === "swap" ? 2 : op === "deposit" ? 2.5 : 1;
      const lines = ["⛽ **Gas Comparison**", ""];
      const sorted = Object.entries(CHAIN_CONFIGS)
        .map(([id, c]) => ({ id, name: c.name, cost: c.gasAvgUsd * multiplier }))
        .sort((a, b) => a.cost - b.cost);
      for (const c of sorted) {
        const bar = "█".repeat(Math.max(1, Math.min(20, Math.round(c.cost * 5))));
        lines.push(`• **${c.name}:** ~$${c.cost.toFixed(2)} ${bar}`);
      }
      lines.push("", `*For \`${op}\` operation. L2s (Polygon, Arbitrum) offer 10-100x cheaper gas.*`);
      return { text: lines.join("\n") };
    }

    case "transfer_tokens": {
      const chainKey = strArg(args, "chain");
      const asset = strArg(args, "asset");
      const amount = numArg(args, "amount");
      const config = CHAIN_CONFIGS[chainKey];
      if (!config?.tokens) return { text: `Unsupported chain: ${chainKey}.` };
      const tokenContract = asset ? config.tokens[asset] : undefined;
      if (!tokenContract) return { text: `Token ${asset} is not configured on ${config.name}.` };
      const risk = riskAssessment(amount, getPortfolioTotal(), config.gasAvgUsd);
      const safety = safetyForTransfer(args, config, risk, tokenContract);
      if (risk.level === "BLOCKED") {
        return {
          text: `🚫 **Transfer blocked:** ${risk.reasons.join("; ")}`,
          safety,
          transactionLifecycle: {
            v: 1,
            state: "blocked",
            tool: "transfer_tokens",
            reason: risk.reasons.join("; "),
            action: "erc20_transfer",
          },
        };
      }
      const riskBadge = risk.level === "HIGH" ? "⚠️ HIGH RISK" : risk.level === "MEDIUM" ? "🟡 MEDIUM" : "✅ LOW";
      const rawTo = strArg(args, "to_address");
      const addr = rawTo.length >= 10 ? `${rawTo.slice(0, 6)}…${rawTo.slice(-4)}` : "pending";
      return {
        text: `📤 **Transfer prepared** [${riskBadge}]\n\n• **Amount:** ${amount} ${asset}\n• **To:** ${addr}\n• **Chain:** ${config.name} (ID ${config.chainId})\n• **Token contract:** \`${tokenContract}\`\n• **Est. gas:** ~$${config.gasAvgUsd.toFixed(2)}\n\nConfirm in your wallet to proceed.`,
        contractContext: {
          action: "erc20_transfer",
          tokenContract,
          chain: chainKey,
          chainId: config.chainId,
          to: rawTo,
          amount,
          asset,
        },
        portfolioPreview: { type: "transfer", fromChain: chainKey, toChain: chainKey, amount },
        safety,
        transactionLifecycle: {
          v: 1,
          state: "previewed",
          tool: "transfer_tokens",
          action: "erc20_transfer",
          chain: chainKey,
        },
      };
    }

    case "swap_tokens": {
      const chainKey = strArg(args, "chain");
      const fromAsset = strArg(args, "from_asset");
      const toAsset = strArg(args, "to_asset");
      const amount = numArg(args, "amount");
      const config = CHAIN_CONFIGS[chainKey];
      if (!config?.protocols?.uniswap || !config.tokens) return { text: `Swaps not available on ${chainKey}.` };
      const uniswap = config.protocols.uniswap;
      const slipBps = 15 + Math.round(amount / 500);
      const risk = riskAssessment(amount, getPortfolioTotal(), config.gasAvgUsd * 2);
      const safety = safetyForSwap(args, config, risk);
      const tokenIn = fromAsset ? config.tokens[fromAsset] : "";
      const tokenOut = toAsset ? config.tokens[toAsset] : "";
      return {
        text: `🔄 **Swap prepared**\n\n• **From:** ${amount} ${fromAsset} → ${toAsset}\n• **Chain:** ${config.name}\n• **Router:** \`${uniswap.router}\`\n• **Est. slippage:** ~${slipBps} bps (${(slipBps / 100).toFixed(2)}%)\n• **Est. gas:** ~$${(config.gasAvgUsd * 2).toFixed(2)}\n\nConfirm to execute.`,
        contractContext: {
          action: "uniswap_exact_input_single",
          router: uniswap.router,
          tokenIn,
          tokenOut,
          chain: chainKey,
          chainId: config.chainId,
          amount,
          maxSlippageBps: Math.min(slipBps * 2, GUARDRAILS.maxSlippageBps),
        },
        safety,
        transactionLifecycle: {
          v: 1,
          state: "previewed",
          tool: "swap_tokens",
          action: "uniswap_exact_input_single",
          chain: chainKey,
        },
      };
    }

    case "bridge_tokens": {
      const fromKey = strArg(args, "from_chain");
      const toKey = strArg(args, "to_chain");
      const from = CHAIN_CONFIGS[fromKey];
      const to = CHAIN_CONFIGS[toKey];
      if (!from || !to) return { text: `Unknown bridge route: ${fromKey} → ${toKey}.` };
      const bridgeCost = from.gasAvgUsd + to.gasAvgUsd + 2.5;
      const amount = numArg(args, "amount");
      const asset = strArg(args, "asset");
      const risk = riskAssessment(amount, getPortfolioTotal(), bridgeCost);
      if (risk.level === "BLOCKED") {
        return {
          text: `🚫 **Bridge blocked:** ${risk.reasons.join("; ")}`,
          transactionLifecycle: {
            v: 1,
            state: "blocked",
            tool: "bridge_tokens",
            reason: risk.reasons.join("; "),
            action: "bridge",
          },
        };
      }
      return {
        text: `🌉 **Bridge preview**\n\n• **Amount:** ${amount} ${asset}\n• **Route:** ${from.name} → ${to.name}\n• **Est. cost:** ~$${bridgeCost.toFixed(2)} (gas + relay)\n• **Risk:** ${risk.level} — ${risk.reasons.join("; ")}\n• **Asset role:** ${asset === "XAUt" ? "Hedge sleeve (not cash)" : "Liquidity / settlement"}\n\n⚠️ Bridge risks: smart contract, relayer delay, partial fills.`,
        portfolioPreview: { type: "bridge", fromChain: fromKey, toChain: toKey, amount, asset },
        transactionLifecycle: {
          v: 1,
          state: "previewed",
          tool: "bridge_tokens",
          action: "bridge",
          chain: fromKey,
        },
      };
    }

    case "aave_deposit": {
      const chainKey = strArg(args, "chain");
      const asset = strArg(args, "asset");
      const amount = numArg(args, "amount");
      const config = CHAIN_CONFIGS[chainKey];
      if (!config?.protocols?.aave) return { text: `Aave not available on ${chainKey}.` };
      const aave = config.protocols.aave;
      const risk = riskAssessment(amount, getPortfolioTotal(), config.gasAvgUsd * 2.5);
      const safety = safetyForAave(args, config, "deposit", risk);
      const tokenContract = asset ? config.tokens[asset] : "";
      return {
        text: `🏦 **Aave Deposit prepared**\n\n• **Asset:** ${asset} · **Amount:** ${amount}\n• **Chain:** ${config.name}\n• **Lending Pool:** \`${aave.lendingPool}\`\n• **Current APY:** ~${aave.avgApy}%\n• **Projected annual:** ~$${((amount * aave.avgApy) / 100).toFixed(2)}\n\nTwo transactions: Approve → Deposit.`,
        contractContext: { action: "aave_deposit", lendingPool: aave.lendingPool, tokenContract, chain: chainKey, chainId: config.chainId, amount },
        safety,
        transactionLifecycle: {
          v: 1,
          state: "previewed",
          tool: "aave_deposit",
          action: "aave_deposit",
          chain: chainKey,
        },
      };
    }

    case "aave_withdraw": {
      const chainKey = strArg(args, "chain");
      const asset = strArg(args, "asset");
      const amount = numArg(args, "amount");
      const config = CHAIN_CONFIGS[chainKey];
      if (!config?.protocols?.aave) return { text: `Aave not available on ${chainKey}.` };
      const risk = riskAssessment(amount, getPortfolioTotal(), config.gasAvgUsd * 2.5);
      const safety = safetyForAave(args, config, "withdraw", risk);
      const tokenContract = asset ? config.tokens[asset] : "";
      return {
        text: `🏦 **Aave Withdrawal prepared**\n\n• **Asset:** ${asset} · **Amount:** ${amount}\n• **Chain:** ${config.name}\n• **Lending Pool:** \`${config.protocols.aave!.lendingPool}\`\n\nConfirm to withdraw.`,
        contractContext: {
          action: "aave_withdraw",
          lendingPool: config.protocols.aave!.lendingPool,
          tokenContract,
          chain: chainKey,
          chainId: config.chainId,
          amount,
        },
        safety,
        transactionLifecycle: {
          v: 1,
          state: "previewed",
          tool: "aave_withdraw",
          action: "aave_withdraw",
          chain: chainKey,
        },
      };
    }

    case "get_portfolio": {
      let totalUSDt = 0;
      let totalXAUt = 0;
      const lines = ["📊 **Portfolio Summary**", ""];
      for (const [chain, bal] of Object.entries(DEMO_PORTFOLIO)) {
        const total = bal.USDt + bal.XAUt;
        lines.push(`• **${CHAIN_CONFIGS[chain]?.name ?? chain}:** $${total.toLocaleString()} (${bal.USDt} USDt · ${bal.XAUt} XAUt)`);
        totalUSDt += bal.USDt;
        totalXAUt += bal.XAUt;
      }
      const nav = totalUSDt + totalXAUt;
      const usdtPct = nav > 0 ? ((totalUSDt / nav) * 100).toFixed(1) : "0";
      lines.push("", `**Total NAV:** $${nav.toLocaleString()}`);
      lines.push(`**USDt (liquidity):** $${totalUSDt.toLocaleString()} (${usdtPct}%) · **XAUt (hedge):** $${totalXAUt.toLocaleString()}`);
      lines.push(`**Reserve status:** ${Number(usdtPct) >= 8 ? "✅ Healthy" : "⚠️ Below 8% minimum"}`);
      return { text: lines.join("\n") };
    }

    case "get_transaction_history":
      return {
        text: "📜 **Recent Transactions**\n\n| # | Type | Amount | Route | Status |\n|---|------|--------|-------|--------|\n| 1 | SEND | 50 USDt | Ethereum → 0x3f2a… | ✔ |\n| 2 | RECV | 120 USDt | ← 0x9a1b… (Polygon) | ✔ |\n| 3 | BRIDGE | 200 USDt | ETH → ARB | ✔ |\n| 4 | DEPOSIT | 500 USDt | → Aave (Polygon) | ✔ |\n| 5 | SWAP | 100 USDt→XAUt | Arbitrum | ✔ |",
      };

    case "get_supported_chains": {
      const lines = ["🔗 **Supported Chains & Protocols**", ""];
      for (const [, config] of Object.entries(CHAIN_CONFIGS)) {
        const protos = [];
        if (config.protocols?.aave) protos.push(`Aave (~${config.protocols.aave.avgApy}% APY)`);
        if (config.protocols?.uniswap) protos.push("Uniswap V3");
        lines.push(`• **${config.name}** (ID ${config.chainId}) · Gas ~$${config.gasAvgUsd} — ${protos.length ? protos.join(", ") : "Transfers only"}`);
      }
      lines.push("", "**Whitelisted protocols:** " + GUARDRAILS.whitelistedProtocols.join(", "));
      return { text: lines.join("\n") };
    }

    case "summarize_portfolio_movements": {
      const days = Math.min(90, Math.max(1, numArg(args, "period_days", 7)));
      const focusRaw = strArg(args, "focus");
      const focus = focusRaw === "usd_t" || focusRaw === "xaut" ? focusRaw : "all";
      const rows: string[] = [];
      let dUsdT = 0;
      let dXAUt = 0;
      for (const chain of Object.keys(DEMO_PORTFOLIO)) {
        const cur = DEMO_PORTFOLIO[chain];
        const prev = PORTFOLIO_7D_AGO[chain] ?? { USDt: cur.USDt, XAUt: cur.XAUt };
        const u = cur.USDt - prev.USDt;
        const x = cur.XAUt - prev.XAUt;
        dUsdT += u;
        dXAUt += x;
        if (focus === "all" || (focus === "usd_t" && u !== 0) || (focus === "xaut" && x !== 0)) {
          rows.push(
            `| ${CHAIN_CONFIGS[chain]?.name ?? chain} | ${u >= 0 ? "+" : ""}$${u.toLocaleString()} USDt | ${x >= 0 ? "+" : ""}$${x.toLocaleString()} XAUt |`,
          );
        }
      }
      const nav = getPortfolioTotal();
      const usdtNav = Object.values(DEMO_PORTFOLIO).reduce((s, v) => s + v.USDt, 0);
      const xautNav = Object.values(DEMO_PORTFOLIO).reduce((s, v) => s + v.XAUt, 0);
      const usdtPct = nav > 0 ? (usdtNav / nav) * 100 : 0;
      const xautPct = nav > 0 ? (xautNav / nav) * 100 : 0;
      const lines = [
        `📉 **Portfolio movements (last ~${days} days, demo model)**`,
        "",
        "**Per-chain delta vs prior snapshot** (USDt / XAUt notional)",
        "",
        "| Chain | Δ USDt | Δ XAUt |",
        "|-------|--------|--------|",
        ...rows,
        "",
        `**Net flows:** ${dUsdT >= 0 ? "+" : ""}$${dUsdT.toLocaleString()} USDt · ${dXAUt >= 0 ? "+" : ""}$${dXAUt.toLocaleString()} XAUt`,
        `**Current sleeve mix:** ~${usdtPct.toFixed(1)}% USDt (liquidity) · ~${xautPct.toFixed(1)}% XAUt (hedge)`,
        "",
        "*Figures are illustrative and tied to the cockpit demo store; connect WDK for live history.*",
      ];
      return { text: lines.join("\n") };
    }

    case "suggest_rebalancing": {
      const nav = getPortfolioTotal();
      const usdtNav = Object.values(DEMO_PORTFOLIO).reduce((s, v) => s + v.USDt, 0);
      const xautNav = Object.values(DEMO_PORTFOLIO).reduce((s, v) => s + v.XAUt, 0);
      const target = Math.min(92, Math.max(GUARDRAILS.minReserveUsdT * 100, numArg(args, "target_usdt_pct", 65)));
      const currentUsdTPct = nav > 0 ? (usdtNav / nav) * 100 : 0;
      const gapPct = target - currentUsdTPct;
      const usdToShift = (Math.abs(gapPct) / 100) * nav;
      const lines = [
        "⚖️ **Rebalancing suggestion (policy-aware)**",
        "",
        `• **Target:** ~${target}% NAV in **USDt** (liquidity) · ~${(100 - target).toFixed(0)}% **XAUt** (hedge)`,
        `• **Current:** ~${currentUsdTPct.toFixed(1)}% USDt · ~${(100 - currentUsdTPct).toFixed(1)}% XAUt`,
        "",
      ];
      if (Math.abs(gapPct) < 1.5) {
        lines.push("**Verdict:** Drift is small — **no trade required** unless you have a cash-flow or risk mandate change.");
        return { text: lines.join("\n") };
      }
      if (gapPct > 0) {
        lines.push(
          `**Direction:** Raise USDt by ~$${usdToShift.toFixed(0)} notional (reduce gold sleeve toward target).`,
          "",
          "**Candidate actions (execute only what fits your mandate):**",
          `1. Swap **~$${Math.min(usdToShift, xautNav * 0.5).toFixed(0)} XAUt → USDt** on an AMM-enabled chain (check slippage).`,
          "2. If new capital is incoming, **prefer USDt** over XAUt until the sleeve aligns.",
          `3. Run **risk_check** before any swap ≥ ${GUARDRAILS.maxDailySpendPct}% NAV/day.`,
        );
      } else {
        lines.push(
          `**Direction:** Raise XAUt (hedge) by ~$${usdToShift.toFixed(0)} notional vs USDt.`,
          "",
          "**Candidate actions:**",
          `1. Swap **USDt → XAUt** on Polygon or Arbitrum for lower **gas vs notional** than mainnet.`,
          "2. Keep **≥ " + (GUARDRAILS.minReserveUsdT * 100).toFixed(0) + "%** USDt as operational reserve.",
          "3. Treat XAUt as **hedge**, not spending money — avoid bridging it for routine gas.",
        );
      }
      lines.push("", "*This is not investment advice; confirm fees and contracts in the UI.*");
      return { text: lines.join("\n") };
    }

    case "draft_transaction_plan": {
      const goal = strArg(args, "goal", "consolidate_to_l2");
      const amountUsd = numArg(args, "amount_usd", 0);
      const amount = amountUsd > 0 ? amountUsd : 500;
      const asset = strArg(args, "asset") === "XAUt" ? "XAUt" : "USDt";
      const primary = strArg(args, "primary_chain");
      const chain = primary && CHAIN_CONFIGS[primary] ? primary : "arbitrum";
      const cfg = CHAIN_CONFIGS[chain];
      const gas1 = cfg.gasAvgUsd;
      const gas2 = cfg.gasAvgUsd * 2;

      const steps: string[] = [];
      if (goal === "consolidate_to_l2") {
        steps.push(
          `1. **Approve** ${asset} on **Ethereum** (if moving from L1) — est gas ~$${CHAIN_CONFIGS.ethereum.gasAvgUsd.toFixed(2)}`,
          `2. **Bridge** ~${amount} ${asset} **Ethereum → ${CHAIN_CONFIGS[chain].name}** — L1 + relay (see compare_chain_routes)`,
          `3. **Verify** balance on ${CHAIN_CONFIGS[chain].name} in Cockpit; reconcile allocation`,
        );
      } else if (goal === "increase_yield") {
        const apy = cfg.protocols?.aave?.avgApy ?? 4;
        steps.push(
          `1. **Approve** ${asset} for Aave on **${cfg.name}** — est ~$${gas1.toFixed(2)}`,
          `2. **Deposit** ~${amount} ${asset} to Aave — second tx ~$${gas2.toFixed(2)}; modeled APY ~${apy}%`,
          `3. **Monitor** health factor / rate changes; plan exit liquidity before large spends`,
        );
      } else if (goal === "raise_hedge") {
        steps.push(
          `1. **Swap** USDt → XAUt on **${cfg.name}** (Uniswap path) — est gas ~$${gas2.toFixed(2)}`,
          `2. **Optional:** move hedge to custody policy; XAUt is **not** for routine gas`,
          `3. **Record** sleeve target vs actual in portfolio view`,
        );
      } else {
        steps.push(
          `1. **Approve** ${asset} on source chain — ~$${gas1.toFixed(2)}`,
          `2. **Bridge** ${amount} ${asset} per chosen route (compare_chain_routes)`,
          `3. **Confirm** destination + run risk_check on the notional`,
        );
      }

      const planText = [
        "📋 **Draft transaction plan** *(review before signing)*",
        "",
        `**Goal:** ${goal.replace(/_/g, " ")} · **Notional:** ~$${amount} ${asset}`,
        "",
        ...steps,
        "",
        "**Guardrails:** Single tx < " +
          GUARDRAILS.maxSingleTxPct +
          "% NAV · gas < " +
          GUARDRAILS.maxGasToAmountRatio * 100 +
          "% of amount · whitelist protocols only.",
      ].join("\n");
      return {
        text: planText,
        portfolioPreview: { type: "plan_draft", goal, amount, asset, chain },
      };
    }

    case "explain_gas_costs": {
      const chainKey = strArg(args, "chain");
      const cfg = CHAIN_CONFIGS[chainKey];
      if (!cfg) return { text: `Unknown chain: ${chainKey}.` };
      const op = strArg(args, "operation", "transfer");
      const mult = op === "swap" ? 2 : op === "deposit" ? 2.5 : op === "bridge" ? 2.2 : 1;
      const est = cfg.gasAvgUsd * mult;
      const amt = numArg(args, "amount_usd", 0);
      const ratio = Number.isFinite(amt) && amt > 0 ? ((est / amt) * 100).toFixed(2) : null;
      const l2 = ["polygon", "arbitrum", "solana", "tron", "ton"].includes(chainKey);
      const lines = [
        "⛽ **Gas cost explainer**",
        "",
        `**Chain:** ${cfg.name} · **Operation class:** ${op}`,
        `**Model estimate:** ~$${est.toFixed(2)} *(avg base × complexity multiplier ${mult}×; not a live quote)*`,
        "",
        "**What you are paying for**",
        "• **Network fee** — compensates validators for including your transaction.",
        op !== "transfer"
          ? "• **Extra calldata / router logic** — swaps, bridges, and deposits run more contract code than a simple send."
          : "• **Simple ERC-20 transfer** — typically one of the cheapest paths.",
        l2
          ? "• **L2 / alt L1** — batching and lower congestion often make **fees tiny vs mainnet Ethereum**."
          : "• **Ethereum L1** — block space is scarce; fees spike when demand is high.",
        "",
        ratio !== null
          ? `**Vs your notional (~$${amt.toLocaleString()}):** gas is **~${ratio}%** of size — ${Number(ratio) > GUARDRAILS.maxGasToAmountRatio * 100 ? "⚠️ high relative to amount; batch or wait" : "reasonable for many use cases"}.`
          : "**Tip:** Compare `get_gas_comparison` across chains for the same operation class.",
        "",
        "*Live execution uses wallet simulation / RPC quotes — use those before submitting.*",
      ];
      return { text: lines.filter(Boolean).join("\n") };
    }

    case "compare_chain_routes": {
      const fromKey = strArg(args, "from_chain");
      const toKey = strArg(args, "to_chain");
      const from = CHAIN_CONFIGS[fromKey];
      const to = CHAIN_CONFIGS[toKey];
      if (!from || !to) return { text: `Unknown route: ${fromKey} → ${toKey}.` };
      if (fromKey === toKey) {
        return { text: "Same source and destination chain — **no bridge**. Use **transfer** or **swap** on that network." };
      }
      const asset = strArg(args, "asset") === "XAUt" ? "XAUt" : "USDt";
      const amount = numArg(args, "amount");
      if (!Number.isFinite(amount) || amount <= 0) return { text: "Provide a positive **amount** to compare routes." };

      const meta = getRouteMeta(fromKey, toKey);
      const baseCost = from.gasAvgUsd + to.gasAvgUsd + meta.relayUsd;
      const risk = riskAssessment(amount, getPortfolioTotal(), baseCost);
      const viaPolygonExtra = fromKey === "ethereum" && toKey === "arbitrum";

      const rows: string[] = [
        "| Route | Est. total (gas+relay demo) | ETA (indicative) | Hops | Notes |",
        "|-------|-----------------------------|------------------|------|-------|",
        `| **Direct:** ${from.name} → ${to.name} | ~$${baseCost.toFixed(2)} | ${meta.etaHours} | ${meta.hops} | ${meta.notes} |`,
      ];

      if (viaPolygonExtra) {
        const alt = from.gasAvgUsd + CHAIN_CONFIGS.polygon.gasAvgUsd * 2 + to.gasAvgUsd + 2.5;
        rows.push(
          `| **Via Polygon hub** (ETH→MATIC→ARB illustrative) | ~$${alt.toFixed(2)} | often slower, extra trust surface | 3+ | Compare UI quotes; not always cheaper after liquidity fees |`,
        );
      }

      const out = [
        "🛤️ **Chain route comparison** *(demo estimates — verify in product)*",
        "",
        `**Move:** ${amount.toLocaleString()} **${asset}** · **${from.name}** → **${to.name}**`,
        `**Risk snapshot:** ${risk.level} — ${risk.reasons[0]}`,
        "",
        ...rows,
        "",
        "**How to read this:** Lower **$** is better for fees, but **hops** and **bridge UI** add smart-contract and timing risk. Prefer **canonical** or **widely audited** bridges for large size.",
      ].join("\n");
      return {
        text: out,
        portfolioPreview: { type: "route_compare", fromChain: fromKey, toChain: toKey, amount, asset },
      };
    }

    default:
      return { text: `Unknown tool: ${name}` };
  }
}
