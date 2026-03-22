const steps = [
  {
    num: "1",
    title: "Sign in & connect",
    desc: "Authenticate, then connect your wallet. Your cockpit loads with balances and activity in view.",
  },
  {
    num: "2",
    title: "Ask, then review",
    desc: "Describe what you want in chat. Claw returns a plan or a ready-to-send card — you confirm, adjust, or move on.",
  },
  {
    num: "3",
    title: "Execute or branch",
    desc: "Confirm to update portfolio and ticker (or submit via WDK on your network). Start another workflow anytime.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative scroll-mt-24 py-24 px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <span className="landing-eyebrow">Three beats</span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl md:leading-tight">
            From chat to chain in seconds
          </h2>
          <p className="mx-auto max-w-lg text-base text-muted-foreground md:text-lg md:leading-relaxed">
            The detailed eight-step journey lives above — here are the three beats most people feel on day one.
          </p>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block"
            aria-hidden
          />
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((s, i) => (
              <div
                key={i}
                className="glass-card-hover relative rounded-2xl border border-white/[0.05] p-8 text-center shadow-sm shadow-black/15"
              >
                <div className="relative z-[1] mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 via-violet-500/15 to-primary/5 text-2xl font-bold text-primary ring-2 ring-primary/25 ring-offset-4 ring-offset-background">
                  {s.num}
                </div>
                <h3 className="mb-2 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
