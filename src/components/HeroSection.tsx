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
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0A0F1F] via-[#1a1030]/90 to-[#0A0F1F]"
      aria-labelledby="hero-heading"
    >
      <OrbitalParticles className="pointer-events-none absolute inset-0 h-full min-h-[100dvh] w-full" />

      {/* Vignette + depth */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,15,31,0.85)_70%)]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-24 pt-28 sm:pt-32">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 48 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card-neon glow-border-neon max-w-4xl rounded-3xl px-6 py-10 text-center shadow-2xl shadow-indigo-500/10 sm:px-10 sm:py-12 md:px-14"
        >
          <div className="mb-8 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-5 py-3 shadow-lg shadow-indigo-500/25 sm:gap-4 sm:px-6">
            <ClawLogo className="h-8 w-8 sm:h-9 sm:w-9" />
            <span className="text-base font-bold tracking-tight text-white sm:text-lg">
              ClawGPT Financial Cockpit
            </span>
            <Badge variant="testnet" className="font-semibold uppercase tracking-wide">
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

          <ul className="mx-auto mb-10 flex max-w-xl flex-col gap-2 text-left text-sm text-[#CBD5E1] sm:text-base">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#818cf8]" aria-hidden />
              <span>Self-custodial via Tether WDK — keys stay with you.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#818cf8]" aria-hidden />
              <span>Natural-language tasks with review cards, workflow log, and audit trail.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#818cf8]" aria-hidden />
              <span>Multi-chain USDt / XAUt context — dashboard + ticker mirror the real cockpit.</span>
            </li>
          </ul>

          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <DemoWalletButton variant="hero" className="gradient-glow-cta w-full min-h-[56px] text-lg sm:w-auto sm:px-10 sm:text-xl" />
            <Link
              to="/auth"
              className="inline-flex h-14 min-h-[56px] w-full items-center justify-center rounded-xl border border-[#6366f1]/40 bg-[#1A1F2E]/80 px-8 text-lg font-semibold text-[#F8FAFC] backdrop-blur-md transition-colors hover:border-[#8b5cf6]/60 hover:bg-[#1A1F2E] sm:w-auto"
            >
              Sign in
            </Link>
            <a
              href="#demo"
              className="inline-flex h-14 min-h-[56px] w-full items-center justify-center rounded-xl border border-[#334155]/80 bg-[#1A1F2E]/60 px-8 text-lg font-semibold text-[#F8FAFC] backdrop-blur-md transition-colors hover:border-[#6366f1]/50 hover:bg-[#1A1F2E] sm:w-auto"
            >
              Watch demo
            </a>
            <a
              href="#journey"
              className="inline-flex h-14 min-h-[56px] w-full items-center justify-center rounded-xl px-6 text-base font-medium text-[#94A3B8] underline-offset-4 hover:text-[#CBD5E1] hover:underline sm:w-auto sm:min-h-0 sm:py-0"
            >
              See full journey
            </a>
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

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[5] h-28 bg-gradient-to-t from-[#0A0F1F] to-transparent" />
    </section>
  );
}
