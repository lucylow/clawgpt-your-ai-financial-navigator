import { MessageCircle, BookOpen, Mail } from "lucide-react";

export default function HelpPage() {
  const resources = [
    { icon: MessageCircle, title: "Chat with Claw", desc: "Go to the Dashboard and ask Claw anything about your portfolio." },
    { icon: BookOpen, title: "Documentation", desc: "Read our guides on WDK integration, multi-chain transfers, and more." },
    { icon: Mail, title: "Contact Support", desc: "Reach out at support@clawgpt.ai for any issues." },
  ];

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
        {resources.map((r) => (
          <div key={r.title} className="glass-card rounded-xl p-5 space-y-3 hover:border-primary/40 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <r.icon size={18} className="text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground">{r.title}</h3>
            <p className="text-xs text-muted-foreground">{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
