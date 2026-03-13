import { MessageSquare, Globe, Shield, BarChart3 } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Conversational AI",
    description: 'Just type "Send 50 USDt to Mike" – Claw handles the rest.',
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
    <section id="features" className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary mb-3 block">
            Why ClawGPT
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            The cockpit for your digital wealth
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Everything you need to manage your Tether-powered assets across chains,
            all through natural conversation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass-card-hover rounded-xl p-8 group"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <f.icon className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
