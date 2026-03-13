import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import CockpitChat from "@/components/cockpit/CockpitChat";
import CockpitDashboard from "@/components/cockpit/CockpitDashboard";

export default function CockpitPage() {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="glass-card border-b border-border/30 px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <span className="font-bold text-foreground">ClawGPT</span>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Cockpit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-xs text-muted-foreground">Testnet</span>
        </div>
      </header>

      {/* Split Screen */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Chat Panel */}
        <div className="lg:w-[400px] xl:w-[440px] border-r border-border/30 flex flex-col h-1/2 lg:h-full">
          <CockpitChat />
        </div>

        {/* Dashboard Panel */}
        <div className="flex-1 h-1/2 lg:h-full overflow-hidden">
          <CockpitDashboard />
        </div>
      </div>
    </div>
  );
}
