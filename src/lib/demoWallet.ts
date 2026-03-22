/** Primary session flag — allows /app without Supabase auth */
export const WALLET_SESSION_KEY = "claw_wallet_session";
/** Legacy key — still read/written for migration */
export const DEMO_SESSION_KEY = "clawgpt_demo_wallet_connected";

/** True when a landing “connect wallet” session is active (allows /app without Supabase). */
export function isWalletSessionActive(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return (
      localStorage.getItem(WALLET_SESSION_KEY) === "1" ||
      localStorage.getItem(DEMO_SESSION_KEY) === "1"
    );
  } catch {
    return false;
  }
}

/** @deprecated Use isWalletSessionActive */
export const isDemoSessionActive = isWalletSessionActive;

export function persistWalletSessionFlags(): boolean {
  try {
    localStorage.setItem(WALLET_SESSION_KEY, "1");
    localStorage.setItem(DEMO_SESSION_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export function clearWalletSessionFlags(): void {
  try {
    localStorage.removeItem(WALLET_SESSION_KEY);
    localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** BIP-39 phrase for the in-browser WDK session (sessionStorage — clear on tab close). */
export const WDK_SEED_SESSION_KEY = "clawgpt_wdk_seed";

/** `"wdk"` = Tether WDK + RPC; `"local"` = persistent sample portfolio when WDK unavailable. */
export const WALLET_MODE_KEY = "clawgpt_wallet_mode";

export const DEMO_WALLET = {
  seed: "test test test test test test test test test test test junk",
  addresses: {
    ethereum: "0x742d35Cc6634C0532925a3b8D7c3093629D4267D",
    polygon: "0x742d35Cc6634C0532925a3b8D7c3093629D4267D",
    arbitrum: "0x742d35Cc6634C0532925a3b8D7c3093629D4267D",
    solana: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    tron: "TJCn9oV3hXR8F8dhm9bU2aGYZaQ1bYkL1x",
    ton: "EQB8Qx8_example_ton_address_clawgpt_network",
  },
  label: "Primary (multi-chain)",
} as const;
