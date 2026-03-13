export default function Footer() {
  return (
    <footer className="border-t border-border/30 py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-bold text-foreground">ClawGPT</span>
          <span className="text-xs text-muted-foreground">© 2026 Tether Hackathon</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
          <a href="#" className="hover:text-foreground transition-colors">Discord</a>
          <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
          <a href="#" className="hover:text-foreground transition-colors">Docs</a>
        </div>
      </div>
    </footer>
  );
}
