import { Link } from "react-router-dom";
import { Zap, Globe } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center z-10">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 opacity-0 animate-fade-in-up">
          Your AI copilot for{" "}
          <span className="gradient-text text-glow">multi-chain</span>{" "}
          finance
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 opacity-0 animate-fade-in-up [animation-delay:200ms]">
          ClawGPT combines the power of Tether WDK and OpenClaw to give you a
          conversational interface to manage USDt, XAUt, and more across 6+
          chains.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 opacity-0 animate-fade-in-up [animation-delay:400ms]">
          <Link
            to="/app"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            Launch app
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg border border-border text-foreground font-semibold hover:bg-secondary transition-all"
          >
            Watch demo
          </a>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground opacity-0 animate-fade-in-up [animation-delay:600ms]">
          <span className="flex items-center gap-1.5">
            <Zap size={14} className="text-primary" /> Live on testnet
          </span>
          <span className="flex items-center gap-1.5">
            <Globe size={14} className="text-primary" /> 6+ chains
          </span>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
