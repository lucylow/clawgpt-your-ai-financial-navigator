import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useAuth } from "@/hooks/useAuth";
import {
  COCKPIT_NAV,
  COCKPIT_NAV_GROUP_LABEL,
  type CockpitNavGroupId,
} from "@/config/cockpitRoutes";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";

const GROUP_ORDER: CockpitNavGroupId[] = ["workspace", "portfolio", "assets", "support"];

export default function CockpitSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const isActive = (href: string) =>
    href === "/app" ? location.pathname === "/app" : location.pathname.startsWith(href);

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 h-screen flex flex-col border-r border-border/30 bg-sidebar-background transition-all duration-300",
        sidebarOpen ? "w-56" : "w-14"
      )}
    >
      <div className="h-14 flex items-center justify-between px-3 border-b border-border/30 shrink-0">
        {sidebarOpen && (
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-foreground text-lg truncate">ClawGPT</span>
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">
              Beta
            </span>
          </Link>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors shrink-0"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto flex flex-col gap-4" aria-label="Cockpit">
        {GROUP_ORDER.map((group) => {
          const items = COCKPIT_NAV.filter((i) => i.group === group);
          return (
            <div key={group}>
              {sidebarOpen && (
                <p className="px-3 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  {COCKPIT_NAV_GROUP_LABEL[group]}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive(item.href)
                        ? "bg-sidebar-accent text-sidebar-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                    )}
                    title={sidebarOpen ? undefined : item.name}
                  >
                    <item.icon size={18} className="shrink-0" aria-hidden />
                    {sidebarOpen && <span>{item.name}</span>}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border/30 shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-sidebar-accent/50 transition-colors w-full"
          title={sidebarOpen ? undefined : "Logout"}
        >
          <LogOut size={18} className="shrink-0" aria-hidden />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
