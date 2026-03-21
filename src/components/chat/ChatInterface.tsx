import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRumbleTips } from "@/hooks/useRumbleTips";
import { Bot, Trash2, AlertCircle } from "lucide-react";
import { assertCanApplyTransfer, evaluateUsdTSpend, totalPortfolioUsd } from "@/lib/economics/portfolioPolicy";
import { shouldBlockExecution } from "@/lib/agentSafety";
import { assessTransaction } from "@/lib/risk-engine";
import { sendMessage } from "@/lib/agentClient";
import { saveChatMessage } from "@/lib/agent";
import {
  isRealWdkSession,
  refreshLivePortfolio,
  sendTransaction,
  simulateTetherTransfer,
} from "@/lib/walletClient";
import { createUserConfirmedIntent } from "@/lib/securityModel";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useDemoStore } from "@/store/useDemoStore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { ChatCardPayload, Message, Transaction } from "@/types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useProactiveAgent } from "@/hooks/useProactiveAgent";
import { COCKPIT_CHAIN_META } from "@/config/chains";
import { useCockpitChainStore } from "@/store/useCockpitChainStore";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "I'm **Claw**, your financial cockpit assistant for **USDt** (spending and liquidity) and **XAUt** (gold hedge) across multiple chains.\n\n" +
    "**What I help with in real use:** see **where your value sits by chain**, get a **plain-language transfer preview** before anything is signed, **compare routes and fees**, and **track activity** alongside the live ticker.\n\n" +
    "You do not need to be a chain expert — ask in everyday language. **Sends and bridges always need your explicit confirmation** (and wallet approval when using WDK).",
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId] = useState(() => generateId());
  const chatRef = useRef<HTMLDivElement>(null);
  const applyAgentUpdate = usePortfolioStore((s) => s.applyAgentUpdate);
  const setAgentIntent = usePortfolioStore((s) => s.setAgentIntent);
  const setAgentError = usePortfolioStore((s) => s.setAgentError);
  const appendAgentWorkflow = usePortfolioStore((s) => s.appendAgentWorkflow);
  const clearAgentWorkflow = usePortfolioStore((s) => s.clearAgentWorkflow);
  const appendDecisionAudit = usePortfolioStore((s) => s.appendDecisionAudit);
  const incrementSessionImpact = usePortfolioStore((s) => s.incrementSessionImpact);
  const sessionImpact = usePortfolioStore((s) => s.agent.sessionImpact);
  const workflowLog = usePortfolioStore((s) => s.agent.workflowLog);
  const decisionAudit = usePortfolioStore((s) => s.agent.decisionAudit ?? []);
  const walletMode = useDemoStore((s) => s.walletMode);
  const isDemoWalletConnected = useDemoStore((s) => s.isDemoWalletConnected);
  const rumbleTips = useRumbleTips();
  const rumbleTipsAnnounced = useRef(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const wdkLive = walletMode === "wdk" && isRealWdkSession();
  const focusChain = useCockpitChainStore((s) => s.focusChain);
  const chainCtx = COCKPIT_CHAIN_META[focusChain];
  const confirmLabels = useMemo(
    () => ({
      transaction: wdkLive ? "Preview OK — submit via WDK" : "Confirm (simulated portfolio)",
      opportunity: wdkLive ? "Simulate allocation shift (no bridge tx yet)" : "Apply suggestion (demo)",
    }),
    [wdkLive],
  );

  const sessionImpactLine = useMemo(() => {
    const s = sessionImpact;
    if (!s.userTurns && !s.structuredPreviews && !s.confirmedActions && !s.preventedMistakes) {
      return null;
    }
    const parts: string[] = [];
    if (s.userTurns) parts.push(`${s.userTurns} question${s.userTurns === 1 ? "" : "s"}`);
    if (s.structuredPreviews) parts.push(`${s.structuredPreviews} structured preview${s.structuredPreviews === 1 ? "" : "s"}`);
    if (s.confirmedActions) parts.push(`${s.confirmedActions} confirmed`);
    if (s.preventedMistakes) parts.push(`${s.preventedMistakes} stopped for safety`);
    return parts.join(" · ");
  }, [sessionImpact]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const pushProactiveMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    appendAgentWorkflow("reconcile", "Proactive insight (autonomy scan)");
  }, [appendAgentWorkflow]);

  useProactiveAgent({ enabled: isDemoWalletConnected, onInsight: pushProactiveMessage });

  useEffect(() => {
    if (rumbleTips.length === 0 || rumbleTipsAnnounced.current) return;
    rumbleTipsAnnounced.current = true;
    const total = rumbleTips.reduce((s, t) => s + t.amount, 0);
    setMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "assistant",
        content:
          `**Rumble tips (dev / mock):** ${rumbleTips.length} event(s), **$${total.toFixed(2)}** total. ` +
          `Production will use your WDK + webhook; cards for split / yield / withdraw can attach here.`,
      },
    ]);
  }, [rumbleTips]);

  const pushTx = useCallback(
    (partial: Omit<Transaction, "hash" | "timestamp">) => {
      const tx: Transaction = {
        ...partial,
        /** Not an on-chain hash — demo ticker only (WDK path uses real tx hashes). */
        hash: `demo:${conversationId}:${Date.now().toString(36)}`,
        timestamp: Date.now(),
      };
      applyAgentUpdate({ type: "add_transaction", tx });
    },
    [applyAgentUpdate, conversationId]
  );

  const onConfirmTransaction = useCallback(
    async (card: Extract<ChatCardPayload, { kind: "transaction_ready" }>) => {
      try {
        appendAgentWorkflow("review", "User confirmed transfer card");

        if (card.safety && shouldBlockExecution(card.safety)) {
          const detail = [...card.safety.policy.violations, ...card.safety.addressValidation.errors].filter(Boolean).join(" ");
          toast({
            variant: "destructive",
            title: "Blocked by safety checks",
            description: detail || "Policy, address validation, or simulation outcome does not allow execution.",
          });
          appendDecisionAudit({ kind: "rejection", summary: "Safety envelope blocked send", detail: { card } });
          appendAgentWorkflow("execute", "Aborted: safety envelope");
          return;
        }

        const st = usePortfolioStore.getState();
        const total = totalPortfolioUsd(st.allocation);
        const spend = evaluateUsdTSpend({
          allocationByAsset: st.allocationByAsset,
          chain: card.chain,
          amountUsd: card.amount,
          totalPortfolioUsd: total,
          gasEstimateUsd: card.feeEstimateUsd ?? 2.5,
        });
        if (!spend.ok) {
          const reason = (spend as { reason: string }).reason;
          toast({ variant: "destructive", title: "Blocked", description: reason });
          appendDecisionAudit({ kind: "rejection", summary: reason, detail: { card } });
          appendAgentWorkflow("execute", "Aborted: spend policy");
          return;
        }

        const recipient =
          card.toAddress?.trim() || import.meta.env.VITE_DEMO_TRANSFER_RECIPIENT?.trim() || "";

        if (wdkLive) {
          if (!recipient.startsWith("0x") || recipient.length < 10) {
            toast({
              variant: "destructive",
              title: "Recipient not configured",
              description:
                "Set VITE_DEMO_TRANSFER_RECIPIENT in .env or provide toAddress on the agent card for testnet sends.",
            });
            appendAgentWorkflow("execute", "Aborted: missing recipient");
            return;
          }

          const evmChains = ["ethereum", "polygon", "arbitrum"] as const;
          if (!evmChains.includes(card.chain as (typeof evmChains)[number])) {
            toast({
              variant: "destructive",
              title: "Live send not wired for this chain",
              description:
                "WDK token transfers in this build use Ethereum, Polygon, or Arbitrum testnets. Use demo mode to simulate other chains.",
            });
            appendAgentWorkflow("execute", "Aborted: non-EVM chain for live send");
            return;
          }

          const risk = assessTransaction({
            amountUsd: card.amount,
            to: recipient,
            chain: card.chain,
            gasEstimateUsd: card.feeEstimateUsd ?? 2.5,
            allocation: st.allocation,
            allocationByAsset: st.allocationByAsset,
          });
          if (risk.recommendation === "BLOCK") {
            toast({
              variant: "destructive",
              title: "Risk check",
              description: risk.individual.map((r) => r.reason).join(" "),
            });
            appendDecisionAudit({ kind: "rejection", summary: "Risk engine blocked send", detail: { risk } });
            appendAgentWorkflow("execute", "Aborted: risk engine");
            return;
          }
          if (risk.recommendation === "REVIEW") {
            toast({
              title: "Review suggested",
              description: risk.individual.map((r) => `${r.level}: ${r.reason}`).join(" · "),
            });
          }

          const sim = await simulateTetherTransfer({
            chain: card.chain,
            to: recipient,
            amount: String(card.amount),
            asset: card.asset === "XAUt" ? "XAUt" : "USDt",
          });
          if (!sim.ok) {
            toast({
              variant: "destructive",
              title: "Simulation failed",
              description: sim.error,
            });
            appendAgentWorkflow("review", `RPC simulation failed: ${sim.error}`);
            appendDecisionAudit({ kind: "rejection", summary: "Simulation reverted or RPC error", detail: { sim } });
            return;
          }
          appendAgentWorkflow("review", `RPC simulation OK — ${sim.summary}`);
          toast({
            title: "Simulation OK",
            description: sim.summary,
          });

          const res = await sendTransaction(
            {
              chain: card.chain,
              to: recipient,
              amount: String(card.amount),
              asset: card.asset === "XAUt" ? "XAUt" : "USDt",
            },
            createUserConfirmedIntent(),
          );
          if (!res.ok) {
            const errMsg = (res as { error: string }).error;
            const hint = (res as { recoveryHint?: string }).recoveryHint;
            toast({
              variant: "destructive",
              title: "Transfer failed",
              description: hint ? `${errMsg} · ${hint}` : errMsg,
            });
            appendAgentWorkflow("execute", `Failed: ${errMsg}${hint ? ` (${hint})` : ""}`);
            return;
          }
          const tx: Transaction = {
            type: "send",
            amount: card.amount,
            asset: "USDt",
            fromChain: card.chain,
            toChain: card.chain,
            toAddress: recipient.slice(0, 6) + "…" + recipient.slice(-4),
            hash: res.hash,
            status: res.status === "confirmed" ? "confirmed" : "pending",
            timestamp: Date.now(),
          };
          applyAgentUpdate({ type: "add_transaction", tx });
          let portfolioRefreshed = false;
          try {
            await refreshLivePortfolio();
            portfolioRefreshed = true;
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Portfolio refresh failed.";
            toast({ variant: "destructive", title: "Sync warning", description: msg });
            appendAgentWorkflow("reconcile", `Portfolio refresh failed: ${msg}`);
          }
          appendAgentWorkflow("execute", `Submitted ${res.hash}`);
          if (portfolioRefreshed) {
            appendAgentWorkflow("reconcile", "Portfolio refreshed");
          }
          appendDecisionAudit({ kind: "execution", summary: `WDK send ${card.amount} USDt`, detail: { hash: res.hash } });
          toast({ title: "Transaction submitted", description: res.hash });
          return;
        }

        pushTx({
          type: "send",
          amount: card.amount,
          asset: "USDt",
          fromChain: card.chain,
          toChain: card.chain,
          toAddress: "0xsarah…",
          status: "confirmed",
        });
        const alloc = { ...usePortfolioStore.getState().allocation };
        const nested = { ...usePortfolioStore.getState().allocationByAsset };
        const chain = card.chain as keyof typeof alloc;
        if (alloc[chain] != null) {
          alloc[chain] = Math.max(0, alloc[chain] - card.amount);
          const row = { ...(nested[card.chain] ?? {}) };
          row.USDt = Math.max(0, (row.USDt ?? 0) - card.amount);
          nested[card.chain] = row;
          applyAgentUpdate({ type: "set_allocation", allocation: alloc });
          usePortfolioStore.getState().setAllocationByAsset(nested);
        }
        appendDecisionAudit({ kind: "execution", summary: `Demo send ${card.amount} USDt`, detail: { chain: card.chain } });
        appendAgentWorkflow("execute", "Simulated send (demo portfolio)");
        appendAgentWorkflow("reconcile", "Portfolio + ticker updated (demo)");
        toast({ title: "Demo transaction", description: `${card.amount} ${card.asset} send simulated.` });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unexpected error.";
        toast({ variant: "destructive", title: "Could not complete transfer", description: msg });
        appendAgentWorkflow("execute", `Unexpected error: ${msg}`);
        appendDecisionAudit({ kind: "rejection", summary: msg, detail: { card } });
      }
    },
    [appendAgentWorkflow, appendDecisionAudit, applyAgentUpdate, pushTx, toast, wdkLive]
  );

  const onConfirmOpportunity = useCallback(
    async (card: Extract<ChatCardPayload, { kind: "opportunity" }>) => {
      try {
        appendAgentWorkflow("review", "User confirmed opportunity card");
        const st = usePortfolioStore.getState();
        const gate = assertCanApplyTransfer({
          allocation: st.allocation,
          allocationByAsset: st.allocationByAsset,
          fromChain: card.fromChain,
          toChain: card.toChain,
          amountUsd: card.amount,
          asset: card.asset ?? "USDt",
          expectedBenefitUsd: card.policyBenefitUsd,
        });
        if (!gate.ok) {
          const reason = (gate as { reason: string }).reason;
          toast({ variant: "destructive", title: "Not executed", description: reason });
          appendDecisionAudit({ kind: "rejection", summary: reason, detail: { card } });
          appendAgentWorkflow("execute", "Aborted: policy gate");
          return;
        }

        applyAgentUpdate({
          type: "transfer",
          fromChain: card.fromChain,
          toChain: card.toChain,
          amount: card.amount,
        });
        pushTx({
          type: "bridge",
          amount: card.amount,
          asset: "USDt",
          fromChain: card.fromChain,
          toChain: card.toChain,
          toAddress: "0xself",
          status: "confirmed",
        });
        appendDecisionAudit({
          kind: "execution",
          summary: `Bridge ${card.amount} ${card.asset ?? "USDt"} ${card.fromChain}→${card.toChain}`,
          detail: { card },
        });
        if (wdkLive) {
          try {
            await refreshLivePortfolio();
            appendAgentWorkflow("reconcile", "Portfolio refreshed after simulated bridge");
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Portfolio refresh failed.";
            toast({ variant: "destructive", title: "Sync warning", description: msg });
            appendAgentWorkflow("reconcile", `Portfolio refresh failed: ${msg}`);
          }
        } else {
          appendAgentWorkflow("execute", "Simulated bridge — no on-chain bridge in this build");
          appendAgentWorkflow("reconcile", "Allocation updated (demo)");
        }
        toast({ title: "Bridge simulated", description: `${card.amount} USDt ${card.fromChain} → ${card.toChain}` });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unexpected error.";
        toast({ variant: "destructive", title: "Could not apply bridge", description: msg });
        appendAgentWorkflow("execute", `Unexpected error: ${msg}`);
        appendDecisionAudit({ kind: "rejection", summary: msg, detail: { card } });
      }
    },
    [appendAgentWorkflow, appendDecisionAudit, applyAgentUpdate, pushTx, toast, wdkLive]
  );

  const onWizardStep = useCallback((messageId: string, step: number) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, wizardStep: step } : m)));
  }, []);

  const onWizardDone = useCallback(
    (_messageId: string) => {
      appendAgentWorkflow("execute", "Recurring wizard completed (demo)");
      appendAgentWorkflow("reconcile", "Schedule stored locally — WDK required for real execution");
      toast({
        title: "Recurring plan saved (demo)",
        description: "Connect WDK to execute on testnet.",
      });
    },
    [appendAgentWorkflow, toast]
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    incrementSessionImpact("userTurns");
    setError(null);
    const userMsg: Message = { id: generateId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);
    setAgentError(null);
    appendAgentWorkflow("intent", text.length > 120 ? `${text.slice(0, 120)}…` : text);

    if (user?.id) {
      saveChatMessage(user.id, conversationId, "user", text);
    }

    const history = [
      ...messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: text },
    ];

    try {
      const result = await sendMessage(text, history);
      setAgentIntent(result.intent ?? null);

      if (result.proposedPlan) {
        appendAgentWorkflow(
          "plan",
          `${result.proposedPlan.title} (${result.proposedPlan.steps.length} steps)`,
        );
      } else if (result.intent) {
        appendAgentWorkflow("plan", `Intent: ${result.intent}`);
      }
      appendAgentWorkflow("review", "Assistant reply ready — confirm any on-chain actions in cards");

      if (result.portfolioUpdate) {
        applyAgentUpdate(result.portfolioUpdate);
      }

      if (result.card) {
        incrementSessionImpact("structuredPreviews");
      }

      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: result.text,
        card: result.card,
        wizardStep: 0,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (user?.id) {
        saveChatMessage(user.id, conversationId, "assistant", result.text, {
          intent: result.intent ?? "",
          hasCard: Boolean(result.card),
        });
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Request failed.";
      setError(errMsg);
      setAgentError(errMsg);
      setMessages((prev) => [...prev, { id: generateId(), role: "assistant", content: `⚠️ ${errMsg}` }]);
      toast({ title: "Error", description: errMsg, variant: "destructive" });
    } finally {
      setIsThinking(false);
    }
  }, [
    input,
    isThinking,
    messages,
    user?.id,
    conversationId,
    applyAgentUpdate,
    appendAgentWorkflow,
    incrementSessionImpact,
    setAgentIntent,
    setAgentError,
    toast,
  ]);

  const handleClear = () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    clearAgentWorkflow();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-4 border-b border-border/30 flex items-center gap-3 shrink-0 bg-gradient-to-r from-secondary/20 to-transparent">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-primary/10 text-primary"
          aria-hidden
        >
          <Bot className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Claw</p>
          <p
            className="text-xs text-muted-foreground"
            aria-live="polite"
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${isThinking ? "shrink-0 bg-pending animate-pulse" : "shrink-0 bg-success"}`}
                aria-hidden
              />
              <span className="text-primary">
                {isThinking
                  ? "Analyzing…"
                  : wdkLive
                    ? `Online · WDK · ${chainCtx.label} (${chainCtx.network})`
                    : "Online · demo / Supabase"}
              </span>
            </span>
            {sessionImpactLine ? (
              <span className="mt-0.5 block text-[10px] text-muted-foreground/95">{sessionImpactLine}</span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="touch-target inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          title="Clear chat"
          aria-label="Clear chat and reset workflow"
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </div>

      {workflowLog.length > 0 && (
        <details className="mx-4 mt-2 text-[10px] text-muted-foreground border border-border/30 rounded-lg px-2 py-1.5 bg-secondary/20 [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer select-none font-medium text-foreground/80 flex items-center gap-2 rounded-md px-0.5 py-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/80" aria-hidden />
            Workflow log
          </summary>
          <ul className="mt-1 space-y-0.5 font-mono max-h-24 overflow-y-auto">
            {workflowLog.slice(-8).map((e, i) => (
              <li key={`${e.at}-${e.phase}-${i}`}>
                <span className="text-primary/90">{e.phase}</span> · {e.detail}
              </li>
            ))}
          </ul>
        </details>
      )}

      {decisionAudit.length > 0 && (
        <details className="mx-4 mt-2 text-[10px] text-muted-foreground border border-border/30 rounded-lg px-2 py-1.5 bg-secondary/20 [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer select-none font-medium text-foreground/80 flex items-center gap-2 rounded-md px-0.5 py-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/90" aria-hidden />
            Decision audit
          </summary>
          <ul className="mt-1 space-y-0.5 font-mono max-h-24 overflow-y-auto">
            {decisionAudit.slice(-6).map((e, i) => (
              <li key={`${e.at}-${e.kind}-${i}`}>
                <span className="text-amber-400/90">{e.kind}</span> · {e.summary}
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-xs underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Dismiss
          </button>
        </div>
      )}

      <MessageList
        messages={messages}
        isThinking={isThinking}
        scrollRef={chatRef}
        onWizardStep={onWizardStep}
        onWizardDone={onWizardDone}
        onConfirmTransaction={onConfirmTransaction}
        onConfirmOpportunity={onConfirmOpportunity}
        confirmTransactionLabel={confirmLabels.transaction}
        confirmOpportunityLabel={confirmLabels.opportunity}
      />

      <MessageInput value={input} onChange={setInput} onSend={handleSend} disabled={isThinking} />
    </div>
  );
}
