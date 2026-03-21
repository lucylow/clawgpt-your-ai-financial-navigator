import { TransactionTicker } from "@/components/ticker/TransactionTicker";

/** Marquee of recent / demo transactions — operational “pulse” for the cockpit. */
export default function Ticker() {
  return (
    <div className="rounded-xl overflow-hidden border border-border/30 bg-background/40">
      <TransactionTicker />
    </div>
  );
}
