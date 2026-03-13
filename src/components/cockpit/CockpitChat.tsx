import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { sendMessageToAgent } from "@/lib/agent";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import type { Message } from "@/types";

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
  const chatRef = useRef<HTMLDivElement>(null);
  const { updateFromAgentCommand } = usePortfolioStore();

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const response = await sendMessageToAgent(text);
    if (response.portfolioUpdate) {
      updateFromAgentCommand(response.portfolioUpdate);
    }

    setMessages((prev) => [
      ...prev,
      { id: (Date.now() + 1).toString(), role: "assistant", content: response.text },
    ]);
    setIsTyping(false);
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
