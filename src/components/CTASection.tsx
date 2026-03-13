import { useState } from "react";

export default function CTASection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <section id="waitlist" className="relative py-24 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="glass-card glow-border rounded-2xl p-10 md:p-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to take control?</h2>
          <p className="text-muted-foreground mb-8">
            Join the waitlist for early access to ClawGPT and be among the first to experience
            AI-powered self-custodial finance.
          </p>

          {submitted ? (
            <p className="text-primary font-semibold">🎉 You're on the list! We'll be in touch.</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="flex-1 bg-secondary/40 border border-border/30 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Notify me
              </button>
            </form>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            We'll never share your email. No spam, only updates.
          </p>
        </div>
      </div>
    </section>
  );
}
