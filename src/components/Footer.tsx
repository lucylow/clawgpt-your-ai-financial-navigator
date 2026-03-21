import { Link } from "react-router-dom";
import { ClawLogo } from "@/components/ClawLogo";

export default function Footer() {
  return (
    <footer className="relative border-t border-border/30 bg-gradient-to-b from-background to-[hsl(222_47%_6%)] py-10 px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <div className="flex items-center gap-3">
            <ClawLogo className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight text-foreground">ClawGPT</span>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">Beta</span>
          </div>
          <span className="text-xs text-muted-foreground">© 2026 Tether Hackathon</span>
          <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground md:text-left">
            AI cockpit — balances, activity, assistant, review, then confirm.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <a href="#journey" className="hover:text-foreground transition-colors">
            Journey
          </a>
          <a href="#demo" className="hover:text-foreground transition-colors">
            Demo
          </a>
          <Link to="/auth" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
          <a href="#" className="hover:text-foreground transition-colors">
            GitHub
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Docs
          </a>
        </nav>
      </div>
    </footer>
  );
}
