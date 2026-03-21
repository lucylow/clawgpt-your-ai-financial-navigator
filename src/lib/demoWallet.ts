/** Session flag for frontend-only demo access (no Supabase auth). */
export const DEMO_SESSION_KEY = "clawgpt_demo_wallet_connected";

/** True when the landing "demo wallet" session is active (allows /app without Supabase). */
export function isDemoSessionActive(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(DEMO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** BIP-39 phrase for the in-browser WDK session (sessionStorage — clear on tab close). */
export const WDK_SEED_SESSION_KEY = "clawgpt_wdk_seed";

/** `"wdk"` = Tether WDK + RPC; `"demo"` = rich mock portfolio. */
export const WALLET_MODE_KEY = "clawgpt_wallet_mode";

export const DEMO_WALLET = {
  seed: "test test test test test test test test test test test junk",
  addresses: {
    ethereum: "0x742d35Cc6634C0532925a3b8D7c3093629D4267D",
    polygon: "0x742d35Cc6634C0532925a3b8D7c3093629D4267D",
    arbitrum: "0x742d35Cc6634C0532925a3b8D7c3093629D4267D",
    solana: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    tron: "TJCn9oV3hXR8F8dhm9bU2aGYZaQ1bYkL1x",
    ton: "EQB8Qx8_example_demo_ton_address_clawgpt_testnet",
  },
  label: "Demo Wallet (Testnet)",
} as const;
