import { useState } from "react";
import { Link } from "react-router-dom";
import DemoWalletButton from "@/components/DemoWalletButton";

export default function CTASection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <section id="waitlist" className="relative scroll-mt-24 py-24 px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
      <div className="mx-auto max-w-2xl text-center">
        <div className="landing-gradient-border">
          <div className="landing-gradient-border-inner glow-border p-10 md:p-14">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl md:leading-tight">
              Ready to take control?
            </h2>
            <p className="mb-8 text-base text-muted-foreground md:text-lg md:leading-relaxed">
              Sign in for a synced cockpit session, launch the demo wallet for instant exploration, or join the waitlist for
              product updates.
            </p>

            <div className="mb-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to="/auth"
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-primary/45 bg-primary/12 px-6 py-3 text-sm font-semibold text-primary shadow-sm shadow-primary/10 transition-colors hover:bg-primary/22"
              >
                Sign in to cockpit
              </Link>
              <DemoWalletButton variant="compact" className="min-h-[48px] justify-center sm:min-w-[200px]" />
            </div>

            {submitted ? (
              <p className="font-semibold text-primary">🎉 You're on the list! We'll be in touch.</p>
            ) : (
              <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="flex-1 rounded-xl border border-border/40 bg-secondary/45 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90"
                >
                  Notify me
                </button>
              </form>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              We'll never share your email. No spam, only updates.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
