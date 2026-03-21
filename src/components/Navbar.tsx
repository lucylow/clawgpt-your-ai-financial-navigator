import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GitBranch, LayoutGrid, Mail, Menu, PlayCircle, Route } from "lucide-react";
import DemoWalletButton from "@/components/DemoWalletButton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  { id: "features", label: "Features", href: "#features", icon: LayoutGrid },
  { id: "journey", label: "Journey", href: "#journey", icon: Route },
  { id: "demo", label: "Demo", href: "#demo", icon: PlayCircle },
  { id: "how-it-works", label: "How it works", href: "#how-it-works", icon: GitBranch },
  { id: "waitlist", label: "Waitlist", href: "#waitlist", icon: Mail },
] as const;

function useActiveSection() {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const ids = NAV_SECTIONS.map((s) => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && e.target.id)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { root: null, rootMargin: "0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return activeId;
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useActiveSection();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const navLinkBase =
    "relative text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1F] rounded-full";

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-16 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground opacity-0 transition-transform focus:z-[100] focus:translate-y-0 focus:opacity-100"
      >
        Skip to content
      </a>

      <nav
        className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30"
        aria-label="Marketing"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-4 py-2 md:py-0">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1F] rounded-sm"
            >
              <span className="text-xl font-bold tracking-tight">ClawGPT</span>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">Beta</span>
            </Link>

            <div className="hidden min-w-0 flex-1 justify-center md:flex">
              <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-full border border-border/35 bg-secondary/25 p-1 shadow-inner shadow-black/20">
                {NAV_SECTIONS.map(({ id, label, href }) => {
                  const isActive = activeSection === id;
                  return (
                    <a
                      key={id}
                      href={href}
                      aria-current={isActive ? "location" : undefined}
                      className={cn(
                        navLinkBase,
                        "px-3 py-1.5 text-muted-foreground hover:text-foreground",
                        isActive && "bg-primary/15 text-primary shadow-sm shadow-primary/10",
                      )}
                    >
                      {label}
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-1 sm:gap-2 md:flex">
              <Link
                to="/auth"
                className="inline-flex min-h-[40px] items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                Sign in
              </Link>
              <DemoWalletButton variant="compact" className="min-h-[40px]" />
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary/50 active:bg-secondary/70 md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-marketing-nav"
              aria-label={mobileOpen ? "Menu open" : "Open menu"}
            >
              <Menu className="h-6 w-6" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      </nav>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          id="mobile-marketing-nav"
          side="right"
          className="flex h-full max-h-[100dvh] w-[min(100%,20rem)] flex-col gap-0 border-l border-border/40 bg-[#0A0F1F]/95 p-0 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0A0F1F]/90"
        >
          <SheetHeader className="shrink-0 border-b border-border/30 px-6 pb-4 pt-6 pr-14 text-left">
            <SheetTitle className="text-lg font-semibold tracking-tight">Menu</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Jump to a section or sign in.
            </SheetDescription>
          </SheetHeader>

          <nav
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
            aria-label="Page sections"
          >
            <div className="flex flex-col gap-1">
            {NAV_SECTIONS.map(({ id, label, href, icon: Icon }) => {
              const isActive = activeSection === id;
              return (
                <a
                  key={id}
                  href={href}
                  onClick={closeMobile}
                  aria-current={isActive ? "location" : undefined}
                  className={cn(
                    "flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1F]",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-secondary/30",
                      isActive && "border-primary/30 bg-primary/10",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {label}
                </a>
              );
            })}
            </div>
          </nav>

          <div className="shrink-0 space-y-2 border-t border-border/30 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
            <Link
              to="/auth"
              onClick={closeMobile}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-border/50 bg-secondary/40 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60"
            >
              Sign in
            </Link>
            <DemoWalletButton variant="compact" className="min-h-[52px] w-full justify-center" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
