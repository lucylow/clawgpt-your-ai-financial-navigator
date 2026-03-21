import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import type { ChatCardPayload, Message } from "@/types";
import { cn } from "@/lib/utils";
import { TransactionPreviewPanel } from "./TransactionPreviewPanel";

interface MessageBubbleProps {
  message: Message;
  onWizardStep?: (messageId: string, step: number) => void;
  onWizardDone?: (messageId: string) => void;
  onConfirmTransaction?: (card: Extract<ChatCardPayload, { kind: "transaction_ready" }>) => void | Promise<void>;
  onConfirmOpportunity?: (card: Extract<ChatCardPayload, { kind: "opportunity" }>) => void | Promise<void>;
  /** Overrides default "Confirm (demo)" / WDK labels from parent */
  confirmTransactionLabel?: string;
  confirmOpportunityLabel?: string;
}

export default function MessageBubble({
  message,
  onWizardStep,
  onWizardDone,
  onConfirmTransaction,
  onConfirmOpportunity,
  confirmTransactionLabel = "Confirm (demo)",
  confirmOpportunityLabel = "Apply suggestion (demo)",
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const step = message.wizardStep ?? 0;

  return (
    <div
      data-message-role={message.role}
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
        <TransactionPreviewPanel
          card={message.card}
          confirmLabel={confirmTransactionLabel}
          onConfirm={(card) => void onConfirmTransaction?.(card)}
        />
      )}

      {message.card?.kind === "opportunity" && (
        <div className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/5 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Opportunity</p>
          {message.card.assetRoleLabel ? (
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Role: {message.card.assetRoleLabel}
              {message.card.asset ? ` · ${message.card.asset}` : ""}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">{message.card.summary}</p>
          <p className="text-foreground text-sm">{message.card.suggestedAction}</p>
          {message.card.costEstimateUsd != null ? (
            <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
              <li>Est. execution cost ~${message.card.costEstimateUsd.toFixed(2)}</li>
              {message.card.slippageBps != null ? (
                <li>Slippage ~{message.card.slippageBps} bps</li>
              ) : null}
              {message.card.expectedNetBenefitUsd != null ? (
                <li>Modeled net vs hold ~${message.card.expectedNetBenefitUsd.toFixed(2)}</li>
              ) : null}
              {message.card.confidence ? <li>Confidence: {message.card.confidence}</li> : null}
            </ul>
          ) : null}
          {message.card.whyNow ? (
            <p className="text-[11px] text-foreground/90">
              <span className="font-medium text-amber-400/90">Why now: </span>
              {message.card.whyNow}
            </p>
          ) : null}
          {message.card.whyNotNow ? (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">Why not / wait: </span>
              {message.card.whyNotNow}
            </p>
          ) : null}
          {message.card.principalRisks?.length ? (
            <p className="text-[10px] text-muted-foreground">
              <span className="font-medium text-foreground/80">Risks: </span>
              {message.card.principalRisks.join("; ")}
            </p>
          ) : null}
          {message.card.liquidityImpact ? (
            <p className="text-[10px] text-muted-foreground">{message.card.liquidityImpact}</p>
          ) : null}
          {message.card.diversificationDelta ? (
            <p className="text-[10px] text-muted-foreground">
              Diversification: {message.card.diversificationDelta}
            </p>
          ) : null}
          {message.card.postTradeChainWeights && Object.keys(message.card.postTradeChainWeights).length > 0 ? (
            <p className="text-[10px] text-muted-foreground font-mono">
              Post-trade chain weights (preview):{" "}
              {Object.entries(message.card.postTradeChainWeights)
                .map(([c, w]) => `${c} ${(w * 100).toFixed(1)}%`)
                .join(" · ")}
            </p>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void onConfirmOpportunity?.(message.card as Extract<ChatCardPayload, { kind: "opportunity" }>)}
          >
            {confirmOpportunityLabel}
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
