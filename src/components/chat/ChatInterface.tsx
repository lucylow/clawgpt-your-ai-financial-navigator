import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, AlertCircle } from "lucide-react";
import { sendMessage } from "@/lib/agentClient";
import { saveChatMessage } from "@/lib/agent";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { ChatCardPayload, Message, Transaction } from "@/types";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

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
  const { applyAgentUpdate, setAgentIntent, setAgentError } = usePortfolioStore();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

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
    (card: Extract<ChatCardPayload, { kind: "transaction_ready" }>) => {
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
      const chain = card.chain as keyof typeof alloc;
      if (alloc[chain] != null) {
        alloc[chain] = Math.max(0, alloc[chain] - card.amount);
        applyAgentUpdate({ type: "set_allocation", allocation: alloc });
      }
      toast({ title: "Demo transaction", description: `${card.amount} ${card.asset} send simulated.` });
    },
    [applyAgentUpdate, pushTx, toast]
  );

  const onConfirmOpportunity = useCallback(
    (card: Extract<ChatCardPayload, { kind: "opportunity" }>) => {
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
      toast({ title: "Bridge simulated", description: `${card.amount} USDt ${card.fromChain} → ${card.toChain}` });
    },
    [applyAgentUpdate, pushTx, toast]
  );

  const onWizardStep = useCallback((messageId: string, step: number) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, wizardStep: step } : m)));
  }, []);

  const onWizardDone = useCallback(
    (_messageId: string) => {
      toast({
        title: "Recurring plan saved (demo)",
        description: "Connect WDK to execute on testnet.",
      });
    },
    [toast]
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
    setAgentIntent,
    setAgentError,
    toast,
  ]);

  const handleClear = () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-4 border-b border-border/30 flex items-center gap-3 shrink-0">
        <span className="text-lg">🤖</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Claw</p>
          <p className="text-xs text-primary">{isThinking ? "Thinking…" : "Online · demo agent"}</p>
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
      />

      <MessageInput value={input} onChange={setInput} onSend={handleSend} disabled={isThinking} />
    </div>
  );
}
