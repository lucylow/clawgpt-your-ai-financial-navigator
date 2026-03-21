import {
  Compass,
  Sparkles,
  LogIn,
  LayoutDashboard,
  Wallet,
  MessageSquare,
  ClipboardCheck,
  GitBranch,
} from "lucide-react";

const phases = [
  {
    icon: Compass,
    title: "Land & orient",
    body: "Arrive on the marketing site, skim the hero, and see how ClawGPT fits your multi-chain workflow.",
  },
  {
    icon: Sparkles,
    title: "Understand the value",
    body: "Conversational AI, Tether WDK self-custody, and a cockpit that ties balances, activity, and automation together.",
  },
  {
    icon: LogIn,
    title: "Sign in",
    body: "Create an account or sign back in — your cockpit and chat history stay tied to your session.",
  },
  {
    icon: LayoutDashboard,
    title: "Enter the cockpit",
    body: "Open the dashboard: assistant on one side, live portfolio and globe on the other — same layout as after Launch demo.",
  },
  {
    icon: Wallet,
    title: "Inspect balances & activity",
    body: "Check portfolio totals, chain mix, and the transaction ticker; drill into Transactions when you need detail.",
  },
  {
    icon: MessageSquare,
    title: "Ask the assistant",
    body: "Describe a task in plain language — sends, bridges, checks, or recurring flows — Claw proposes a plan.",
  },
  {
    icon: ClipboardCheck,
    title: "Review the action",
    body: "Cards and policy checks surface amounts, fees, and risk before anything touches your wallet (or demo state).",
  },
  {
    icon: GitBranch,
    title: "Confirm or continue",
    body: "Confirm to execute, dismiss to revise, or start another workflow — the workflow log keeps the trail readable.",
  },
] as const;

export default function ProductJourneySection() {
  return (
    <section
      id="journey"
      className="relative scroll-mt-24 py-20 px-4 sm:py-28"
      aria-labelledby="journey-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center sm:mb-16">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-primary">
            End-to-end flow
          </span>
          <h2 id="journey-heading" className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
            From landing page to confirmed action
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground md:text-lg">
            ClawGPT is built around a single journey: understand the product, authenticate, use the cockpit, and always
            review before you execute.
          </p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {phases.map((phase, i) => (
            <li key={phase.title}>
              <article className="glass-card-hover flex h-full flex-col rounded-xl p-6 text-left">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <phase.icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="mb-2 text-base font-semibold leading-snug">{phase.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{phase.body}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
