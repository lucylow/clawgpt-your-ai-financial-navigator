const steps = [
  {
    num: "1",
    title: "Sign in & connect",
    desc: "Authenticate, then connect a demo or WDK wallet. Your cockpit loads with balances and activity in view.",
  },
  {
    num: "2",
    title: "Ask, then review",
    desc: "Describe what you want in chat. Claw returns a plan or a ready-to-send card — you confirm, adjust, or move on.",
  },
  {
    num: "3",
    title: "Execute or branch",
    desc: "Confirm to update portfolio and ticker (or submit via WDK on testnet). Start another workflow anytime.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative scroll-mt-24 py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            From chat to chain in seconds
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            The detailed eight-step journey lives above — here are the three beats most people feel on day one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="glass-card-hover rounded-xl p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5 text-2xl font-bold text-primary">
                {s.num}
              </div>
              <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
