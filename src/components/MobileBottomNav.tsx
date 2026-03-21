import { NavLink } from "react-router-dom";
import { LayoutDashboard, MessageCircle, PieChart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/chat", end: false, label: "Chat", icon: MessageCircle },
  { to: "/app/portfolio", end: false, label: "Portfolio", icon: PieChart },
  { to: "/app/settings", end: false, label: "Settings", icon: Settings },
] as const;

/**
 * Thumb-zone primary navigation (< md). Fixed bottom, safe-area aware, 48px+ targets.
 */
export default function MobileBottomNav() {
  return (
    <nav
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-50",
        "border-t border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        "safe-inset-bottom pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      )}
      aria-label="Primary"
    >
      <ul className="flex max-w-full items-stretch justify-between gap-1 px-1 pt-1">
        {items.map(({ to, end, label, icon: Icon }) => (
          <li key={to} className="min-w-0 flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "touch-target flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium text-muted-foreground transition-colors",
                  "active:scale-[0.98]",
                  isActive && "bg-primary/15 text-primary"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative flex h-10 w-10 items-center justify-center">
                    <Icon
                      className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")}
                      strokeWidth={isActive ? 2.25 : 2}
                      aria-hidden
                    />
                    {isActive && (
                      <span className="absolute bottom-0 h-1 w-1 rounded-full bg-primary" aria-hidden />
                    )}
                  </span>
                  <span className="truncate leading-tight">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
