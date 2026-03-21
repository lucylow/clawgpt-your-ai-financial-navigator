import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-border/30 py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <div className="flex items-center gap-3">
            <span className="font-bold text-foreground">ClawGPT</span>
            <span className="text-xs text-muted-foreground">© 2026 Tether Hackathon</span>
          </div>
          <p className="text-center text-xs text-muted-foreground md:text-left">
            AI cockpit — balances, activity, assistant, review, then confirm.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
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
