const steps = [
  { num: "1", title: "Connect & create", desc: "Generate or import your WDK wallet. Your keys, your control." },
  { num: "2", title: "Talk to Claw", desc: "Natural language commands to check balances, send funds, or find yields." },
  { num: "3", title: "Watch it happen", desc: "Real-time dashboard with 3D globe and live transaction feed." },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            From chat to chain in seconds
          </h2>
          <p className="text-muted-foreground">Three simple steps to autonomous finance.</p>
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
