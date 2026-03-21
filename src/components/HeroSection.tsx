import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import DemoWalletButton from "@/components/DemoWalletButton";
import OrbitalParticles from "@/components/OrbitalParticles";
import { ClawLogo } from "@/components/ClawLogo";
import { Badge } from "@/components/ui/badge";

export default function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-[#15102a]/95 to-background"
      aria-labelledby="hero-heading"
    >
      <OrbitalParticles className="pointer-events-none absolute inset-0 h-full min-h-[100dvh] w-full" />

      {/* Vignette + depth */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,15,31,0.78)_72%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,hsl(239_84%_67%/0.12),transparent_55%)]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-24 pt-28 sm:pt-32">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 48 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card-neon glow-border-neon max-w-4xl rounded-[1.75rem] px-6 py-10 text-center shadow-2xl shadow-indigo-500/15 ring-1 ring-white/[0.08] sm:px-10 sm:py-12 md:px-14"
        >
          <div className="mb-8 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#8b5cf6] px-5 py-3 shadow-lg shadow-indigo-500/30 ring-1 ring-white/15 sm:gap-4 sm:px-6">
            <ClawLogo className="h-8 w-8 drop-shadow sm:h-9 sm:w-9" />
            <span className="text-base font-bold tracking-tight text-white sm:text-lg">
              ClawGPT Financial Cockpit
            </span>
            <Badge variant="testnet" className="border-white/20 bg-white/10 font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
              WDK Testnet
            </Badge>
          </div>

          <h1
            id="hero-heading"
            className="mb-6 text-5xl font-black leading-[1.05] tracking-tight text-[#F8FAFC] md:text-7xl"
          >
            Your AI{" "}
            <span className="bg-gradient-to-r from-[#818cf8] via-[#a78bfa] to-[#8b5cf6] bg-clip-text text-transparent">
              Financial
            </span>{" "}
            Wingman
          </h1>

          <p className="mx-auto mb-6 max-w-2xl text-lg leading-relaxed text-[#94A3B8] md:text-2xl md:leading-relaxed">
            One cockpit for balances, live activity, and an AI assistant that proposes plans — you confirm before anything
            moves on-chain (or in demo).
          </p>

          <ul className="mx-auto mb-10 flex max-w-xl flex-col gap-2 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent px-4 py-4 text-left text-sm text-[#CBD5E1] shadow-inner shadow-black/20 sm:px-5 sm:text-base">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#a5b4fc]" aria-hidden />
              <span>Self-custodial via Tether WDK — keys stay with you.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#a5b4fc]" aria-hidden />
              <span>Natural-language tasks with review cards, workflow log, and audit trail.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#a5b4fc]" aria-hidden />
              <span>Multi-chain USDt / XAUt context — dashboard + ticker mirror the real cockpit.</span>
            </li>
          </ul>

          <div className="flex w-full max-w-xl flex-col gap-3 sm:mx-auto">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <DemoWalletButton
                variant="hero"
                className="gradient-glow-cta w-full min-h-[56px] text-lg sm:w-auto sm:min-w-[min(100%,14rem)] sm:px-10 sm:text-xl"
              />
              <Link
                to="/auth"
                className="inline-flex h-14 min-h-[56px] w-full items-center justify-center rounded-xl border border-[#6366f1]/40 bg-[#1A1F2E]/80 px-8 text-lg font-semibold text-foreground backdrop-blur-md transition-colors hover:border-[#8b5cf6]/60 hover:bg-[#1A1F2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto sm:min-w-[min(100%,12rem)]"
              >
                Sign in
              </Link>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              <a
                href="#demo"
                className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-xl border border-border/80 bg-secondary/40 px-6 text-base font-semibold text-foreground backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto sm:px-8"
              >
                Watch demo
              </a>
              <a
                href="#journey"
                className="inline-flex min-h-[48px] items-center justify-center rounded-lg px-2 py-2 text-base font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-0 sm:py-1"
              >
                See full journey
              </a>
            </div>
          </div>

          <p className="mt-8 text-sm text-[#94A3B8]">
            Mock demo — no API keys. Already have an account?{" "}
            <Link to="/auth" className="font-medium text-[#a5b4fc] underline-offset-4 hover:text-[#c4b5fd] hover:underline">
              Sign in
            </Link>{" "}
            to sync your cockpit session.
          </p>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[5] h-32 bg-gradient-to-t from-[#0A0F1F] via-[#0A0F1F]/85 to-transparent" />
    </section>
  );
}
