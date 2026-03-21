import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ChatCardPayload } from "@/types";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { CopyTextButton } from "./CopyTextButton";

type Card = Extract<ChatCardPayload, { kind: "transaction_ready" }>;

export interface TransactionPreviewPanelProps {
  card: Card;
  onConfirm: (card: Card) => void | Promise<void>;
  confirmLabel: string;
}

function formatNetOutflow(amount: number, feeUsd: number | undefined): string {
  const fee = feeUsd ?? 0;
  const total = amount + fee;
  return `~$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })} (amount + est. fees)`;
}

export function TransactionPreviewPanel({ card, onConfirm, confirmLabel }: TransactionPreviewPanelProps) {
  const headingId = useId();
  const hasSafety = Boolean(card.safety);
  const dest = card.toAddress?.trim();

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className={cn(
        "mt-3 rounded-xl border-2 border-primary/35 bg-card/60 p-4 shadow-sm",
        "ring-1 ring-inset ring-primary/10",
      )}
    >
      <p id={headingId} className="text-xs font-semibold uppercase tracking-wide text-primary">
        Review before you confirm
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        This action moves value on-chain. Verify amount, network, and destination before approving.
      </p>

      <dl className="mt-4 space-y-2.5 border-t border-border/40 pt-3 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</dt>
          <dd className="tabular-nums text-lg font-semibold text-foreground">
            {card.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
            <span className="text-base font-medium text-muted-foreground">{card.asset}</span>
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Network</dt>
          <dd className="font-medium text-foreground">{card.chain}</dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Destination</dt>
          <dd className="text-right font-medium text-foreground">{card.toLabel}</dd>
        </div>
        {card.feeEstimateUsd != null ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Est. fees</dt>
            <dd className="tabular-nums text-muted-foreground">~${card.feeEstimateUsd.toFixed(2)}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border/30 pt-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected outflow</dt>
          <dd className="tabular-nums text-sm text-foreground/90">{formatNetOutflow(card.amount, card.feeEstimateUsd)}</dd>
        </div>
      </dl>

      {dest ? (
        <div className="mt-3 flex items-start gap-1 rounded-lg border border-border/40 bg-secondary/25 px-2 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Raw address</p>
            <p className="break-all font-mono text-[11px] leading-snug text-foreground/90">{dest}</p>
          </div>
          <CopyTextButton text={dest} label="Copy destination address" />
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-warning">
          No raw address on this preview — confirm your recipient in wallet or env before live send.
        </p>
      )}

      {card.reserveNote ? <p className="mt-2 text-[11px] text-muted-foreground">{card.reserveNote}</p> : null}

      {hasSafety && card.safety ? (
        <Collapsible className="mt-3 rounded-lg border border-border/35 bg-secondary/20">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-foreground/90 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&[data-state=open]>svg]:rotate-180">
            Safety & simulation details
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 border-t border-border/30 px-3 pb-3 pt-2 text-[10px] text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground/85">Approval gate:</span> {card.safety.approvalGate.reason}
            </p>
            <p>
              <span className="font-semibold text-foreground/85">Address:</span>{" "}
              {card.safety.addressValidation.valid ? (
                <span className="text-success">Valid ({card.safety.addressValidation.chain})</span>
              ) : (
                <span className="text-destructive">{card.safety.addressValidation.errors.join(" · ")}</span>
              )}
            </p>
            <p>
              <span className="font-semibold text-foreground/85">Policy:</span>{" "}
              {card.safety.policy.passed ? (
                <span className="text-success">Passed</span>
              ) : (
                <span className="text-destructive">{card.safety.policy.violations.join(" · ")}</span>
              )}
            </p>
            <p>
              <span className="font-semibold text-foreground/85">Simulation:</span> {card.safety.transactionSimulation.outcome} · ~$
              {card.safety.transactionSimulation.gasEstimateUsd.toFixed(2)} gas (model) — {card.safety.transactionSimulation.summary}
            </p>
            {card.safety.actionPreview.steps.length > 0 ? (
              <ul className="list-inside list-disc pt-0.5">
                {card.safety.actionPreview.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {!hasSafety && card.feeEstimateUsd != null ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Est. gas / fees ~${card.feeEstimateUsd.toFixed(2)}
          {card.usdtAfterOnChain != null ? ` · USDt on-chain after ~$${card.usdtAfterOnChain.toFixed(0)}` : ""}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          size="default"
          className="w-full sm:w-auto sm:min-w-[200px]"
          onClick={() => void onConfirm(card)}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
