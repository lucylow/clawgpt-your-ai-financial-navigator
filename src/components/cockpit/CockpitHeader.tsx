import { useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, Menu, AlertTriangle, RefreshCw } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDemoStore } from "@/store/useDemoStore";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useAuth } from "@/hooks/useAuth";
import { getCockpitRouteMeta } from "@/config/cockpitRoutes";
import { getDemoPortfolioSnapshot } from "@/lib/mockData";
import { WALLET_MODE_KEY } from "@/lib/demoWallet";
import { cn } from "@/lib/utils";
import BackendNotificationsBell from "@/components/cockpit/BackendNotificationsBell";

function initialsFromUser(user: { email?: string | null; user_metadata?: { full_name?: string } } | null) {
  const name = user?.user_metadata?.full_name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() ?? "U";
  }
  const em = user?.email?.trim();
  if (em && em.includes("@")) {
    return em.slice(0, 2).toUpperCase();
  }
  return "U";
}

export default function CockpitHeader() {
  const { toggleSidebar } = useUIStore();
  const location = useLocation();
  const { user } = useAuth();
  const meta = getCockpitRouteMeta(location.pathname);
  const isDemoWalletConnected = useDemoStore((s) => s.isDemoWalletConnected);
  const walletMode = useDemoStore((s) => s.walletMode);
  const portfolioSyncError = usePortfolioStore((s) => s.portfolioSyncError);
  const setPortfolioSyncError = usePortfolioStore((s) => s.setPortfolioSyncError);
  const totalValue = usePortfolioStore((s) => s.totalValue);
  const hydrateDemoPortfolio = usePortfolioStore((s) => s.hydrateDemoPortfolio);

  const safeTotal = Number.isFinite(totalValue) && totalValue >= 0 ? totalValue : 0;

  const showPortfolioPulse = location.pathname === "/app" || location.pathname === "/app/";

  const handleRefreshDemo = useCallback(() => {
    if (!isDemoWalletConnected) return;
    const mode = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(WALLET_MODE_KEY) : null;
    if (mode === "wdk") return;
    hydrateDemoPortfolio(getDemoPortfolioSnapshot());
  }, [hydrateDemoPortfolio, isDemoWalletConnected]);

  const userInitials = useMemo(() => initialsFromUser(user), [user]);

  return (
    <header className="flex flex-col border-b border-border/30 bg-background/80 backdrop-blur-md shrink-0 z-10">
      {portfolioSyncError && (
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs bg-amber-500/10 border-b border-amber-500/25 text-amber-200"
          role="alert"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="flex-1 min-w-0">{portfolioSyncError}</span>
          <button
            type="button"
            onClick={() => setPortfolioSyncError(null)}
            className="shrink-0 underline text-amber-100/90 hover:text-amber-50"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="min-h-14 flex flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0">
        <div className="flex items-start gap-3 min-w-0 sm:items-center">
          <button
            type="button"
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mt-0.5 sm:mt-0"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 gap-y-1">
              <Link to="/app" className="font-bold text-foreground truncate sm:hidden">
                ClawGPT
              </Link>
              <h1 className="text-base font-semibold text-foreground tracking-tight truncate">{meta.title}</h1>
              <Badge
                variant="secondary"
                className="hidden sm:inline-flex text-[10px] uppercase tracking-wide shrink-0"
              >
                Testnet · 6 chains
              </Badge>
              {isDemoWalletConnected && (
                <Badge
                  variant={walletMode === "wdk" ? "default" : "outline"}
                  className={
                    walletMode === "wdk"
                      ? "text-[10px] text-emerald-100 bg-emerald-600/30 border-emerald-500/50 shrink-0"
                      : "text-[10px] text-amber-400 border-amber-500/40 bg-amber-500/10 shrink-0"
                  }
                >
                  {walletMode === "wdk" ? "Real WDK" : "Demo mode"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1">{meta.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0 pl-10 sm:pl-0">
          {showPortfolioPulse && (
            <div
              className="hidden md:flex flex-col items-end text-right mr-1 border-r border-border/40 pr-3"
              aria-label="Portfolio total"
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">${safeTotal.toLocaleString()}</span>
            </div>
          )}
          {isDemoWalletConnected && walletMode !== "wdk" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={handleRefreshDemo}
              title="Reload demo portfolio snapshot"
              aria-label="Reload demo portfolio snapshot"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <BackendNotificationsBell />
          <Link
            to="/app/chat"
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-md transition-colors",
              location.pathname.startsWith("/app/chat")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Open Claw chat"
            aria-current={location.pathname.startsWith("/app/chat") ? "page" : undefined}
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          </Link>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-foreground"
            title={user?.email ?? "Account"}
          >
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
