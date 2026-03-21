import { MessageSquare, Globe, Shield, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: MessageSquare,
    title: "Conversational AI",
    description:
      'Ask in plain language — Claw proposes a plan or a ready-to-send card; you confirm before any state changes.',
  },
  {
    icon: Globe,
    title: "6+ Chains",
    description: "Ethereum, Polygon, Arbitrum, Solana, Tron, TON – all in one place.",
  },
  {
    icon: Shield,
    title: "Self-custodial",
    description: "Powered by Tether WDK – you control the keys, always.",
  },
  {
    icon: BarChart3,
    title: "Live dashboard",
    description: "3D globe, real-time charts, Bloomberg-style ticker.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative scroll-mt-24 py-24 px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 text-center">
          <span className="landing-eyebrow">Why ClawGPT</span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl md:leading-tight">
            The cockpit for your digital wealth
          </h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Everything you need to manage your Tether-powered assets across chains,
            all through natural conversation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-white/[0.06] p-8 transition-all duration-300",
                "glass-card-hover",
                "animate-fade-in-up",
              )}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden
              />
              <div className="relative">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 via-violet-500/15 to-primary/5 ring-1 ring-white/10 transition-all duration-300 group-hover:from-primary/35 group-hover:ring-primary/25">
                  <f.icon className="text-primary" size={24} strokeWidth={2} aria-hidden />
                </div>
                <h3 className="mb-2 text-xl font-semibold tracking-tight">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
