import { useCallback, useRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

const CHIPS = [
  "Summarize portfolio movements",
  "Suggest rebalancing to 65% USDt",
  "Draft a transaction plan for yield",
  "Explain gas on Arbitrum vs Ethereum",
  "Compare bridge routes ETH → Arbitrum",
] as const;

interface MessageInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export default function MessageInput({ value, onChange, onSend, disabled }: MessageInputProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      onSend();
    },
    [onSend],
  );

  return (
    <div className="border-t border-border/30 shrink-0 bg-background/40">
      <p className="sr-only" id="chat-composer-hint">
        Press Enter to send. Shift+Enter for a new line.
      </p>
      <div className="px-4 pt-3 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => {
              onChange(c);
              taRef.current?.focus();
            }}
            className={cn(
              "text-left text-xs px-3 py-2 min-h-[40px] rounded-full border border-border/50 bg-secondary/30 text-muted-foreground",
              "hover:text-foreground hover:border-primary/40 hover:bg-secondary/50 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="p-4 flex gap-2 items-end">
        <textarea
          ref={taRef}
          id="chat-message-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask Claw anything…"
          rows={1}
          aria-describedby="chat-composer-hint"
          className={cn(
            "flex-1 resize-y min-h-[44px] max-h-32 bg-secondary/40 border border-border/30 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
            "hover:bg-primary/90 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:opacity-50 disabled:pointer-events-none",
          )}
        >
          <Send size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
