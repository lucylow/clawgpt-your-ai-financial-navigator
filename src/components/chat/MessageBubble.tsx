import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import type { ChatCardPayload, Message } from "@/types";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  onWizardStep?: (messageId: string, step: number) => void;
  onWizardDone?: (messageId: string) => void;
  onConfirmTransaction?: (card: Extract<ChatCardPayload, { kind: "transaction_ready" }>) => void;
  onConfirmOpportunity?: (card: Extract<ChatCardPayload, { kind: "opportunity" }>) => void;
}

export default function MessageBubble({
  message,
  onWizardStep,
  onWizardDone,
  onConfirmTransaction,
  onConfirmOpportunity,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const step = message.wizardStep ?? 0;

  return (
    <div
      className={cn(
        "max-w-[90%] rounded-xl border text-sm shadow-sm transition-colors",
        isUser
          ? "ml-auto bg-primary/15 border-primary/35 px-4 py-3"
          : "mr-auto bg-secondary/40 border-border/40 px-4 py-3"
      )}
    >
      {!isUser && message.content ? (
        <div className="prose prose-sm prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>strong]:text-foreground">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      ) : isUser ? (
        <span className="whitespace-pre-wrap">{message.content}</span>
      ) : null}

      {message.card?.kind === "transaction_ready" && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-background/40 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Transaction ready</p>
          <p className="text-foreground">
            Send {message.card.amount} {message.card.asset} on {message.card.chain} → {message.card.toLabel}
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => onConfirmTransaction?.(message.card)}
            >
              Confirm (demo)
            </Button>
          </div>
        </div>
      )}

      {message.card?.kind === "opportunity" && (
        <div className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/5 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Opportunity</p>
          <p className="text-muted-foreground text-xs">{message.card.summary}</p>
          <p className="text-foreground text-sm">{message.card.suggestedAction}</p>
          <Button size="sm" variant="secondary" onClick={() => onConfirmOpportunity?.(message.card!)}>
            Apply suggestion (demo)
          </Button>
        </div>
      )}

      {message.card?.kind === "recurring_wizard" && (
        <div className="mt-3 rounded-lg border border-border/50 bg-background/30 p-3 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recurring buy · {message.card.asset} · {message.card.frequency}
          </p>
          <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
            {message.card.steps.map((s, i) => (
              <li key={s} className={cn(i === step ? "text-primary font-medium" : undefined)}>
                {s}
              </li>
            ))}
          </ol>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onWizardStep?.(message.id, Math.max(0, step - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < message.card.steps.length - 1 ? (
              <Button size="sm" onClick={() => onWizardStep?.(message.id, step + 1)}>
                Next
              </Button>
            ) : (
              <Button size="sm" onClick={() => onWizardDone?.(message.id)}>
                Done
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
