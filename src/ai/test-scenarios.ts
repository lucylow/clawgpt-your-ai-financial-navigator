import { ClawUserIntent, type ClawUserIntent as ClawUserIntentType } from "@/ai/chat-schema";

/** Regression fixtures for prompt + JSON shape expectations (manual / future automated eval). */
export type ClawTestScenario = {
  id: string;
  userMessage: string;
  expectedIntent: ClawUserIntentType;
  expectJsonShape: string[];
  expectContains: string[];
};

export const CLAW_TEST_SCENARIOS: ClawTestScenario[] = [
  {
    id: "newbie_portfolio_overview",
    userMessage: "How much USDT do I have across chains? I don't use L2s much.",
    expectedIntent: ClawUserIntent.SHOW_PORTFOLIO,
    expectJsonShape: ["v", "mode", "blocks", "footer_disclaimer", "primary_intent"],
    expectContains: ["balance", "chain", "footer"],
  },
  {
    id: "over_spend_attempt",
    userMessage: "Send 10000 USDT to Alice on Ethereum.",
    expectedIntent: ClawUserIntent.SEND_FUNDS,
    expectJsonShape: ["footer_disclaimer"],
    expectContains: ["10000", "balance", "exceed", "confirm"],
  },
  {
    id: "yield_optimization",
    userMessage: "Where should I park idle USDT for the best yield?",
    expectedIntent: ClawUserIntent.OPTIMIZE_YIELD,
    expectJsonShape: ["skill_label", "estimated_costs"],
    expectContains: ["APY", "Aave", "80%"],
  },
  {
    id: "rumble_creator_payout",
    userMessage: "I got many small USDT tips on Tron from streaming — how should I consolidate?",
    expectedIntent: ClawUserIntent.SHOW_PORTFOLIO,
    expectJsonShape: ["blocks"],
    expectContains: ["tron", "USDT", "gas", "next"],
  },
];
