import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useAuth } from "@/hooks/useAuth";
  LayoutDashboard,
  PieChart,
  History,
  Settings,
  HelpCircle,
  LogOut,
  Wallet,
  Image,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/app", icon: LayoutDashboard },
  { name: "Portfolio", href: "/app/portfolio", icon: PieChart },
  { name: "Transactions", href: "/app/transactions", icon: History },
  { name: "Wallets", href: "/app/wallets", icon: Wallet },
  { name: "NFTs", href: "/app/nfts", icon: Image },
  { name: "Settings", href: "/app/settings", icon: Settings },
  { name: "Help", href: "/app/help", icon: HelpCircle },
];

export default function CockpitSidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 h-screen flex flex-col border-r border-border/30 bg-sidebar-background transition-all duration-300",
        sidebarOpen ? "w-56" : "w-14"
      )}
    >
      {/* Logo area */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-border/30 shrink-0">
        {sidebarOpen && (
          <Link to="/" className="flex items-center gap-2">
            <span className="font-bold text-foreground text-lg">ClawGPT</span>
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
              Beta
            </span>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            item.href === "/app"
              ? location.pathname === "/app"
              : location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              )}
              title={sidebarOpen ? undefined : item.name}
            >
              <item.icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-border/30 shrink-0">
        <button
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-sidebar-accent/50 transition-colors w-full"
          title={sidebarOpen ? undefined : "Logout"}
        >
          <LogOut size={18} className="shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
