import { TransactionTicker } from "@/components/ticker/TransactionTicker";

/** Marquee of recent transactions — operational pulse for the cockpit. */
export default function Ticker() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border/30 bg-background/40 shadow-sm"
      role="presentation"
    >
      <TransactionTicker />
    </div>
  );
}
