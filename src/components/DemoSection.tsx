import { useState, useRef, useEffect, Fragment } from "react";
import { Send } from "lucide-react";

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/\*\*/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground/95">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

interface Message {
  from: "user" | "claw";
  text: string;
  /** Simulates an assistant “card” awaiting confirmation — matches cockpit review step */
  pendingReview?: {
    summary: string;
    detail: string;
  };
}

const initialMessages: Message[] = [
  { from: "claw", text: "Hi! I'm Claw — ask for balances, sends, or the next workflow." },
  { from: "user", text: "What's my portfolio?" },
  { from: "claw", text: "You have **8,240 USDt** and **4.2 XAUt** across 3 chains. Want to send or bridge next?" },
];

function getAssistantReply(msg: string): Omit<Message, "from"> {
  const lower = msg.toLowerCase();
  if (lower.includes("send")) {
    return {
      text: "Here's the proposed transfer — review details, then confirm or dismiss.",
      pendingReview: {
        summary: "Send 50 USDt → Sarah",
        detail: "0x3f2a…c91d · Ethereum · Gas ~$2.10",
      },
    };
  }
  if (lower.includes("balance")) {
    return { text: "You have 8,240 USDt and 4.2 XAUt (spot). Open **Transactions** in the cockpit for live activity." };
  }
  if (lower.includes("swap")) {
    return { text: "Ready to swap. Which token pair and amount should I line up?" };
  }
  return { text: "Try: “Send 50 USDt to Sarah” to see the review step, or ask for balances." };
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
      const reply = getAssistantReply(text);
      setMessages((prev) => [...prev, { from: "claw", ...reply }]);
    }, 800);
  };

  const confirmPending = (index: number) => {
    setMessages((prev) => {
      const next = [...prev];
      const m = next[index];
      if (!m?.pendingReview) return prev;
      const { pendingReview, ...rest } = m;
      next[index] = { ...rest, text: `Confirmed: ${pendingReview.summary}. Updating demo ticker…` };
      next.push({
        from: "claw",
        text: "Done. Ask for **balances**, start a **swap**, or describe another task — same review pattern as the real cockpit.",
      });
      return next;
    });
  };

  const dismissPending = (index: number) => {
    setMessages((prev) => {
      const next = [...prev];
      const m = next[index];
      if (!m?.pendingReview) return prev;
      const { pendingReview, ...rest } = m;
      next[index] = {
        ...rest,
        text: `Dismissed: ${pendingReview.summary}. Say what to change (amount, chain, or recipient).`,
      };
      return next;
    });
  };

  return (
    <section id="demo" className="relative scroll-mt-24 py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">See it in action</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Type a message — including <span className="text-foreground/90">“send …”</span> — to walk through{" "}
            <strong className="font-semibold text-foreground/95">review → confirm → next workflow</strong>, the same rhythm
            as the cockpit assistant.
          </p>
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
                  className={`max-w-[85%] space-y-2 ${m.from === "user" ? "ml-auto" : ""}`}
                >
                  <div
                    className={`rounded-lg p-3 text-sm transition-all ${
                      m.from === "user"
                        ? "bg-primary/20 border border-primary/30"
                        : "bg-secondary/50 border border-border/20"
                    }`}
                  >
                    <InlineBold text={m.text} />
                  </div>
                  {m.pendingReview && (
                    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-left text-xs text-amber-100/95">
                      <p className="font-semibold text-amber-50">{m.pendingReview.summary}</p>
                      <p className="mt-1 font-mono text-[11px] text-amber-100/80">{m.pendingReview.detail}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => confirmPending(i)}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissPending(i)}
                          className="rounded-md border border-border/50 bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border/30 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder='Try: Send 50 USDt to Sarah'
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
