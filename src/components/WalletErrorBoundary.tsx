import { Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { useWalletSessionStore } from "@/store/useWalletSessionStore";
import type { ReactNode } from "react";

function WalletErrorFallback() {
  const navigate = useNavigate();
  const resumeLocalPortfolio = useWalletSessionStore((s) => s.resumeLocalPortfolio);

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-border/40 bg-card/80 p-8 text-center shadow-inner">
      <Wallet className="h-16 w-16 text-muted-foreground" aria-hidden />
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Wallet unavailable</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          RPC timeout, insufficient funds, or a client error stopped the cockpit. Continue with a synced local
          portfolio or reconnect on the wallets page.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="secondary" onClick={() => resumeLocalPortfolio()}>
          Continue with portfolio
        </Button>
        <Button type="button" onClick={() => navigate("/app/wallets")}>
          Reconnect wallet
        </Button>
      </div>
    </div>
  );
}

/** Isolates wallet/3D subtree failures — offers recovery + reconnect without losing the shell. */
export function WalletErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary fallback={<WalletErrorFallback />}>{children}</ErrorBoundary>;
}
