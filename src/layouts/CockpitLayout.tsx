import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import CockpitSidebar from "@/components/cockpit/CockpitSidebar";
import CockpitHeader from "@/components/cockpit/CockpitHeader";
import { WalletErrorBoundary } from "@/components/WalletErrorBoundary";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useDemoModeEffects } from "@/hooks/useDemoModeEffects";
import { useDemoStore } from "@/store/useDemoStore";
import { getDemoPortfolioSnapshot } from "@/lib/mockData";
import { restoreSessionIfNeeded } from "@/lib/walletClient";
import { WALLET_MODE_KEY } from "@/lib/demoWallet";
import { usePortfolioStore } from "@/store/usePortfolioStore";

export default function CockpitLayout() {
  const { sidebarOpen } = useUIStore();
  useDemoModeEffects();

  useEffect(() => {
    if (!useDemoStore.getState().isDemoWalletConnected) return;
    const mode =
      typeof sessionStorage !== "undefined" ? sessionStorage.getItem(WALLET_MODE_KEY) : null;
    if (mode === "wdk") {
      void restoreSessionIfNeeded();
      return;
    }
    usePortfolioStore.getState().hydrateDemoPortfolio(getDemoPortfolioSnapshot());
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
        <main className="flex-1 overflow-hidden pb-[5.5rem] md:pb-0">
          <WalletErrorBoundary>
            <Outlet />
          </WalletErrorBoundary>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
