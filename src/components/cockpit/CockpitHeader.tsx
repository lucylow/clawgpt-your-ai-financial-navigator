import { Bell, Menu } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

export default function CockpitHeader() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border/30 bg-background/80 backdrop-blur-sm shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-xs text-muted-foreground">Testnet</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-foreground">
          CN
        </div>
      </div>
    </header>
  );
}
