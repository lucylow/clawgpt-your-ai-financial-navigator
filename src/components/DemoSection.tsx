import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface Message {
  from: "user" | "claw";
  text: string;
}

const initialMessages: Message[] = [
  { from: "claw", text: "Hi! I'm Claw, your financial assistant." },
  { from: "user", text: "Show my portfolio" },
  { from: "claw", text: "You have 8,240 USDt and 4.2 XAUt across 3 chains." },
];

function getResponse(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("send")) return "Transaction prepared: 50 USDt to Sarah (0x3f2...). Gas: ~$2. Confirm?";
  if (lower.includes("balance")) return "You have 8,240 USDt and 4.2 XAUt.";
  if (lower.includes("swap")) return "Ready to swap. Which tokens and amount?";
  return "I can help with that. Could you be more specific?";
}

export default function DemoSection() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: "claw", text: getResponse(text) }]);
    }, 800);
  };

  return (
    <section id="demo" className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">See it in action</h2>
          <p className="text-muted-foreground">Type a message to simulate a conversation.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat panel */}
          <div className="glass-card rounded-xl overflow-hidden flex flex-col h-[480px]">
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-3">
              <span className="text-lg">🤖</span>
              <div>
                <p className="text-sm font-semibold">Claw</p>
                <p className="text-xs text-primary">online</p>
              </div>
            </div>

            <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[80%] p-3 rounded-lg text-sm transition-all ${
                    m.from === "user"
                      ? "ml-auto bg-primary/20 border border-primary/30"
                      : "bg-secondary/50"
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border/30 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Try: Send 50 USDt to Sarah"
                className="flex-1 bg-secondary/40 border border-border/30 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={send}
                className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* Dashboard panel */}
          <div className="glass-card rounded-xl p-6 flex flex-col justify-between h-[480px]">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse-glow [animation-delay:300ms]" />
              <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse-glow [animation-delay:600ms]" />
            </div>

            <div className="space-y-6 flex-1">
              {/* Balances */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">USDt</span>
                  <span className="text-xl font-bold">$8,240</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full w-[65%] rounded-full bg-primary/60" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">XAUt</span>
                  <span className="text-xl font-bold">$4,520</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full w-[35%] rounded-full bg-primary/40" />
                </div>
              </div>

              {/* Tx feed */}
              <div className="glass-card rounded-lg p-4 mt-auto">
                <p className="text-xs font-mono text-primary">
                  ► 12:04 SENT 50 USDt → 0x3f2... (ETH) ✔
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
