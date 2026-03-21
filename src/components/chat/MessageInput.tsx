import { Send } from "lucide-react";

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
  return (
    <div className="border-t border-border/30 shrink-0">
      <div className="px-4 pt-3 flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => onChange(c)}
            className="text-xs px-2.5 py-1 rounded-full border border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>
      <div className="p-4 flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
          placeholder="Ask Claw anything…"
          className="flex-1 bg-secondary/40 border border-border/30 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
