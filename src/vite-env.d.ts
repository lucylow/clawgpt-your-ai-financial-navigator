/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL (Edge Functions base: `{url}/functions/v1/...`). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon / publishable key — used by the JS client and `agent-chat` invoke. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Optional HTTPS endpoint that accepts POST `{ events: ObservabilityEvent[] }` JSON batches. */
  readonly VITE_OBSERVABILITY_INGEST_URL?: string;
  /** Optional public path when the app is not served at domain root (read in vite.config only). */
  readonly VITE_BASE_PATH?: string;
  readonly VITE_USE_MOCK_AGENT?: string;
  /** When true, wallet-session bypass is disabled for /app — Supabase session required. */
  readonly VITE_REQUIRE_AUTH_FOR_APP?: string;
  /** Default 0x recipient for offline “send to Sarah” when using real WDK on EVM networks */
  readonly VITE_DEMO_TRANSFER_RECIPIENT?: string;
  readonly VITE_USE_WDK?: string;
  readonly VITE_ETH_RPC_SEPOLIA?: string;
  readonly VITE_POLYGON_RPC_AMOY?: string;
  readonly VITE_ARBITRUM_RPC_SEPOLIA?: string;
  readonly VITE_TRON_RPC_SHASTA?: string;
  readonly VITE_SOLANA_RPC_DEVNET?: string;
  readonly VITE_TON_RPC_TESTNET?: string;
  readonly VITE_TONCENTER_API_KEY?: string;
  readonly VITE_USDT_ETHEREUM_SEPOLIA?: string;
  readonly VITE_XAUT_ETHEREUM_SEPOLIA?: string;
  readonly VITE_USDT_POLYGON_AMOY?: string;
  readonly VITE_XAUT_POLYGON_AMOY?: string;
  readonly VITE_USDT_ARBITRUM_SEPOLIA?: string;
  readonly VITE_XAUT_ARBITRUM_SEPOLIA?: string;
  readonly VITE_USDT_SOLANA_DEVNET?: string;
  readonly VITE_XAUT_SOLANA_DEVNET?: string;
  readonly VITE_USDT_TRON_SHASTA?: string;
  readonly VITE_XAUT_TRON_SHASTA?: string;
  readonly VITE_USDT_TON_TESTNET?: string;
  readonly VITE_XAUT_TON_TESTNET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
