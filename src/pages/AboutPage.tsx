import MarketingSubpage from "@/components/MarketingSubpage";

export default function AboutPage() {
  return (
    <MarketingSubpage title="About ClawGPT">
      <p>
        ClawGPT is an AI financial cockpit for reviewing balances, activity, and execution plans across chains
        before you confirm anything on-chain.
      </p>
      <p>
        Built for the Tether ecosystem, it pairs conversational guidance with portfolio views so you can ask
        questions, compare scenarios, and stay oriented without leaving one surface.
      </p>
      <h2>What you can do</h2>
      <ul>
        <li>Chat with the agent for explanations and next steps</li>
        <li>Track portfolio allocation and transaction history</li>
        <li>Manage wallets and explore collectibles in one place</li>
      </ul>
    </MarketingSubpage>
  );
}
