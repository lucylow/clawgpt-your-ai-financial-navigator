import { Bell, Menu, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useUIStore } from "@/store/useUIStore";
import { Badge } from "@/components/ui/badge";
import { useDemoStore } from "@/store/useDemoStore";
import { usePortfolioStore } from "@/store/usePortfolioStore";

export default function CockpitHeader() {
  const { toggleSidebar } = useUIStore();
  const isDemoWalletConnected = useDemoStore((s) => s.isDemoWalletConnected);
  const walletMode = useDemoStore((s) => s.walletMode);
  const portfolioSyncError = usePortfolioStore((s) => s.portfolioSyncError);
  const setPortfolioSyncError = usePortfolioStore((s) => s.setPortfolioSyncError);

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
      <div className="h-14 flex items-center justify-between px-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Menu size={18} />
        </button>
        <Link to="/app" className="font-bold text-foreground truncate">
          ClawGPT
        </Link>
        <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] uppercase tracking-wide">
          Testnet · 6 chains
        </Badge>
        {isDemoWalletConnected && (
          <Badge
            variant={walletMode === "wdk" ? "default" : "outline"}
            className={
              walletMode === "wdk"
                ? "text-[10px] text-emerald-100 bg-emerald-600/30 border-emerald-500/50"
                : "text-[10px] text-amber-400 border-amber-500/40 bg-amber-500/10"
            }
          >
            {walletMode === "wdk" ? "Real WDK" : "Demo mode"}
          </Badge>
        )}
      </div>
        <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/app/chat"
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
          title="Open Claw chat"
        >
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
        </Link>
        <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-foreground">
          CN
        </div>
      </div>
      </div>
    </header>
  );
}
