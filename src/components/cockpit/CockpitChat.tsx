import { useState, useRef, useEffect } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { sendMessageToAgent } from "@/lib/agent";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import type { Message } from "@/types";
import { useToast } from "@/hooks/use-toast";

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hi! I'm Claw, your AI financial assistant. I can help you manage USDt and XAUt across 6+ chains. Try asking me to show your portfolio or send funds.",
  },
];

export default function CockpitChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const { updateFromAgentCommand } = usePortfolioStore();
  const { toast } = useToast();

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setError(null);
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await sendMessageToAgent(text);

      if (response.error) {
        toast({
          title: "Agent Warning",
          description: response.text,
          variant: "destructive",
        });
      }

      if (response.portfolioUpdate) {
        updateFromAgentCommand(response.portfolioUpdate);
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: response.text },
      ]);
    } catch (err) {
      console.error("[CockpitChat] Send failed:", err);
      const errorMsg = "⚠️ Failed to reach the agent. Please try again.";
      setError(errorMsg);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: errorMsg },
      ]);
      toast({
        title: "Connection Error",
        description: "Could not reach the AI agent.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/30 flex items-center gap-3 shrink-0">
        <span className="text-lg">🤖</span>
        <div>
          <p className="text-sm font-semibold text-foreground">Claw</p>
          <p className="text-xs text-primary">online</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-primary/20 border border-primary/30"
                : "bg-secondary/50"
            }`}
          >
            {m.content}
          </div>
        ))}
        {isTyping && (
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
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Try: Show my portfolio"
          className="flex-1 bg-secondary/40 border border-border/30 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          onClick={handleSend}
          disabled={isTyping}
          className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
