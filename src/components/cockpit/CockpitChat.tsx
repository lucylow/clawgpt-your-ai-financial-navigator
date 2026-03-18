import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, AlertCircle, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { streamAgentMessage, saveChatMessage, loadConversation } from "@/lib/agent";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@/types";
import { useToast } from "@/hooks/use-toast";


function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm **Claw**, your AI financial assistant. I can help you manage USDt and XAUt across multiple blockchains.\n\nTry asking me to:\n- Show your portfolio\n- Send or swap tokens\n- Deposit into Aave\n- Bridge assets across chains",
};

export default function CockpitChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId] = useState(() => generateId());
  const chatRef = useRef<HTMLDivElement>(null);
  const { updateFromAgentCommand } = usePortfolioStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const loadedRef = useRef(false);

  // Load conversation history on mount
  useEffect(() => {
    if (!user?.id || loadedRef.current) return;
    loadedRef.current = true;
    // We start fresh each session but could load previous conversations here
  }, [user?.id]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    const userMsg: Message = { id: generateId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    // Save user message
    if (user?.id) {
      saveChatMessage(user.id, conversationId, "user", text);
    }

    // Build history for context
    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    let assistantContent = "";
    const assistantId = generateId();

    try {
      await streamAgentMessage({
        content: text,
        history,
        onDelta: (token) => {
          assistantContent += token;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.id === assistantId) {
              return prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              );
            }
            return [...prev, { id: assistantId, role: "assistant", content: assistantContent }];
          });
        },
        onMetadata: (meta) => {
          if (meta.portfolioUpdate) {
            updateFromAgentCommand(meta.portfolioUpdate);
          }
          // contractContext can be used for wallet signing in the future
        },
        onDone: () => {
          setIsStreaming(false);
          // Save assistant message
          if (user?.id && assistantContent) {
            saveChatMessage(user.id, conversationId, "assistant", assistantContent);
          }
        },
        onError: (errMsg) => {
          setIsStreaming(false);
          setError(errMsg);
          setMessages((prev) => [
            ...prev,
            { id: generateId(), role: "assistant", content: `⚠️ ${errMsg}` },
          ]);
          toast({ title: "Agent Error", description: errMsg, variant: "destructive" });
        },
      });
    } catch (err) {
      console.error("[CockpitChat] Stream failed:", err);
      setIsStreaming(false);
      const errMsg = "Failed to reach the agent. Please try again.";
      setError(errMsg);
      toast({ title: "Connection Error", description: errMsg, variant: "destructive" });
    }
  }, [input, isStreaming, messages, user?.id, conversationId, updateFromAgentCommand, toast]);

  const handleClear = () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/30 flex items-center gap-3 shrink-0">
        <span className="text-lg">🤖</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Claw</p>
          <p className="text-xs text-primary">
            {isStreaming ? "typing…" : "online"}
          </p>
        </div>
        <button
          onClick={handleClear}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          title="Clear chat"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] p-3 rounded-lg text-sm ${
              m.role === "user"
                ? "ml-auto bg-primary/20 border border-primary/30"
                : "bg-secondary/50"
            }`}
          >
            {m.role === "assistant" ? (
              <div className="prose prose-sm prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ) : (
              <span className="whitespace-pre-wrap">{m.content}</span>
            )}
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 size={14} className="animate-spin" />
            Claw is thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/30 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask Claw anything..."
          className="flex-1 bg-secondary/40 border border-border/30 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          disabled={isStreaming}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming}
          className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
