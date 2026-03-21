import MarketingSubpage from "@/components/MarketingSubpage";

export default function PrivacyPage() {
  return (
    <MarketingSubpage title="Privacy Policy">
      <p>
        This policy describes how ClawGPT handles information when you use the product. It is a high-level
        summary for transparency; your deployment may have additional terms from your organization.
      </p>
      <h2>Information we use</h2>
      <p>
        We may process account identifiers (such as email for sign-in), usage data needed to run the app, and
        content you send to the assistant to generate responses. Wallet and chain activity shown in the cockpit
        depends on what you connect and authorize.
      </p>
      <h2>How we use it</h2>
      <p>
        Data is used to provide features, secure sessions, improve reliability, and comply with law. We do not
        sell your personal information.
      </p>
      <h2>Your choices</h2>
      <p>
        You can disconnect integrations, sign out, or contact support to exercise rights available in your
        region. For questions, use the contact options listed on the Help page inside the app.
      </p>
    </MarketingSubpage>
  );
}
