import { Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import CockpitSidebar from "@/components/cockpit/CockpitSidebar";
import CockpitHeader from "@/components/cockpit/CockpitHeader";
import { WalletErrorBoundary } from "@/components/WalletErrorBoundary";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useWalletSessionEffects } from "@/hooks/useWalletSessionEffects";
import { useWalletSessionStore } from "@/store/useWalletSessionStore";
import { getLocalPortfolioSnapshot } from "@/lib/dataSimulator";
import { WALLET_MODE_KEY } from "@/lib/demoWallet";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useSupabaseEventStream } from "@/hooks/useSupabaseEventStream";

export default function CockpitLayout() {
  const { sidebarOpen } = useUIStore();
  useWalletSessionEffects();
  useSupabaseEventStream();

  useEffect(() => {
    if (!useWalletSessionStore.getState().isWalletConnected) return;
    const mode =
      typeof sessionStorage !== "undefined" ? sessionStorage.getItem(WALLET_MODE_KEY) : null;
    if (mode === "wdk") {
      void import("@/lib/walletClient")
        .then(({ restoreSessionIfNeeded }) => restoreSessionIfNeeded())
        .catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          usePortfolioStore.getState().setPortfolioSyncError(`Wallet: ${msg}`);
        });
      return;
    }
    usePortfolioStore.getState().hydratePortfolio(getLocalPortfolioSnapshot());
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background text-foreground">
      <CockpitSidebar />
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          sidebarOpen ? "ml-56" : "ml-14"
        )}
      >
        <CockpitHeader />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(5.5rem,env(safe-area-inset-bottom))] md:pb-0">
          <WalletErrorBoundary>
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center p-8" role="status">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading page" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </WalletErrorBoundary>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
