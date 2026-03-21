import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRumbleTips } from "@/hooks/useRumbleTips";
import { Trash2, AlertCircle } from "lucide-react";
import { assertCanApplyTransfer, evaluateUsdTSpend, totalPortfolioUsd } from "@/lib/economics/portfolioPolicy";
import { assessTransaction } from "@/lib/risk-engine";
import { sendMessage } from "@/lib/agentClient";
import { saveChatMessage } from "@/lib/agent";
import {
  isRealWdkSession,
  refreshLivePortfolio,
  sendTransaction,
} from "@/lib/walletClient";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useDemoStore } from "@/store/useDemoStore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { ChatCardPayload, Message, Transaction } from "@/types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useProactiveAgent } from "@/hooks/useProactiveAgent";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm **Claw**, your AI financial assistant for the **ClawGPT Cockpit**. I can surface portfolio totals, prep transactions, and walk recurring flows — all wired to the dashboard on the right.\n\nTry the chips below or ask in natural language.",
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
  const workflowLog = usePortfolioStore((s) => s.agent.workflowLog);
  const decisionAudit = usePortfolioStore((s) => s.agent.decisionAudit ?? []);
  const walletMode = useDemoStore((s) => s.walletMode);
  const isDemoWalletConnected = useDemoStore((s) => s.isDemoWalletConnected);
  const rumbleTips = useRumbleTips();
  const rumbleTipsAnnounced = useRef(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const wdkLive = walletMode === "wdk" && isRealWdkSession();
  const confirmLabels = useMemo(
    () => ({
      transaction: wdkLive ? "Preview OK — submit via WDK" : "Confirm (simulated portfolio)",
      opportunity: wdkLive ? "Simulate allocation shift (no bridge tx yet)" : "Apply suggestion (demo)",
    }),
    [wdkLive],
  );

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
        hash: "0x" + Math.random().toString(16).slice(2, 10) + "…",
        timestamp: Date.now(),
      };
      applyAgentUpdate({ type: "add_transaction", tx });
    },
    [applyAgentUpdate]
  );

  const onConfirmTransaction = useCallback(
    async (card: Extract<ChatCardPayload, { kind: "transaction_ready" }>) => {
      appendAgentWorkflow("review", "User confirmed transfer card");

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

        const res = await sendTransaction({
          chain: card.chain,
          to: recipient,
          amount: String(card.amount),
          asset: card.asset === "XAUt" ? "XAUt" : "USDt",
        });
        if (!res.ok) {
          toast({ variant: "destructive", title: "Transfer failed", description: res.error });
          appendAgentWorkflow("execute", `Failed: ${res.error}`);
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
    },
    [appendAgentWorkflow, appendDecisionAudit, applyAgentUpdate, pushTx, toast, wdkLive]
  );

  const onConfirmOpportunity = useCallback(
    async (card: Extract<ChatCardPayload, { kind: "opportunity" }>) => {
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
        toast({ variant: "destructive", title: "Not executed", description: gate.reason });
        appendDecisionAudit({ kind: "rejection", summary: gate.reason, detail: { card } });
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
      <div className="px-5 py-4 border-b border-border/30 flex items-center gap-3 shrink-0">
        <span className="text-lg">🤖</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Claw</p>
          <p className="text-xs text-primary">
            {isThinking ? "Thinking…" : wdkLive ? "Online · WDK session" : "Online · agent (mock or Supabase)"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          title="Clear chat"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {workflowLog.length > 0 && (
        <details className="mx-4 mt-2 text-[10px] text-muted-foreground border border-border/30 rounded-md px-2 py-1.5 bg-secondary/20">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">Workflow log</summary>
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
        <details className="mx-4 mt-2 text-[10px] text-muted-foreground border border-border/30 rounded-md px-2 py-1.5 bg-secondary/20">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">Decision audit</summary>
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
          <button type="button" onClick={() => setError(null)} className="ml-auto text-xs underline">
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
