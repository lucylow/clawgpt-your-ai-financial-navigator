import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useEffect, useState } from "react";

export default function Ticker() {
  const { transactions } = usePortfolioStore();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((o) => o - 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const items = transactions.map((tx) => {
    const time = new Date(tx.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const icon = tx.status === "confirmed" ? "✔" : tx.status === "pending" ? "⏳" : "✘";
    return `► ${time} ${tx.type.toUpperCase()} ${tx.amount} ${tx.asset} → ${tx.toAddress.slice(0, 6)}... (${tx.fromChain.toUpperCase()}) ${icon}`;
  });

  const text = items.join("     │     ");

  return (
    <div className="glass-card rounded-lg overflow-hidden">
      <div className="py-2 px-4 whitespace-nowrap font-mono text-xs text-primary" style={{ transform: `translateX(${offset}px)` }}>
        {text}     │     {text}
      </div>
    </div>
  );
}
