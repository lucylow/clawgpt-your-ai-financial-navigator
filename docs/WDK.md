# WDK integration in ClawGPT

This document maps **ClawGPT** to [Tether’s Wallet Development Kit](https://docs.wdk.tether.io/sdk): which packages are used, how registration works, and how read vs write paths are separated.

## Official references

- **SDK (orchestrator, `registerWallet`, `registerProtocol`):** [Get Started — SDK](https://docs.wdk.tether.io/sdk)
- **Module types (core, wallet, swap, bridge, lending):** same page — use these categories when naming new work.

## Packages in this repository

| Role | npm package | Used for |
|------|----------------|----------|
| Orchestrator | `@tetherto/wdk` | `new WDK(seed)` and unified `getAccount(chain, index)` |
| EVM wallets | `@tetherto/wdk-wallet-evm` | Ethereum, Polygon, Arbitrum (testnets via `VITE_*` RPCs) |
| Solana | `@tetherto/wdk-wallet-solana` | Balance reads on devnet |
| Tron | `@tetherto/wdk-wallet-tron` | Balance reads on Shasta |
| TON | `@tetherto/wdk-wallet-ton` | Balance reads on TON testnet |

Exact per-chain mapping and **runtime capabilities** (what this build actually implements) live in `src/lib/wdkRegistry.ts` — prefer importing from there instead of scattering chain checks.

## Registration flow (browser)

`ClawWdkBridge.connect` in `src/lib/wdkClient.ts` follows the documented pattern: initialize the core module, then register each wallet module with chain-specific config (RPC / TON client / Solana commitment). Registration is driven by `SUPPORTED_WDK_CHAINS` and `CHAIN_WALLET_REGISTRY` so adding a chain is a localized change.

## Read vs write

| Operation | Where it runs | Notes |
|-----------|----------------|--------|
| Balances, addresses | Client WDK (`ClawWdkBridge`) | Read-only RPC / API calls |
| `eth_call` / `eth_estimateGas` preview | `src/lib/evmSimulation.ts` | Dry-run before user confirms |
| Token transfer (broadcast) | `ClawWdkBridge.sendTetherTransfer` | Only after UI + `UserConfirmedChainIntent` via `walletClient.sendTransaction` |
| Agent / LLM / edge tools | `supabase/functions/agent-chat` | Previews and policy only — **no private keys, no broadcast** |

## Transaction plan lifecycle

Structured plan types for execution-class actions are defined in `src/contracts/transactionPlan.ts` (`TransactionPlanV1`, `TransactionApprovalState`). The UI should keep **preview** and **approved** states distinct; the backend must not treat chat text as approval.

## Environment

See root `.env.example` for `VITE_*` RPC and token contract overrides. Failures to configure testnet token addresses surface as zero balances or validation errors — consult WDK and chain-specific quickstarts when swapping networks.

## Changing behavior

1. Read the relevant WDK doc section (wallet module, chain, or protocol).
2. Update `wdkRegistry` capabilities if support changes.
3. Implement in `wdkClient` / adapters — keep React components free of direct `@tetherto/*` imports.
4. Add tests (`src/lib/wdkRegistry.test.ts` or feature tests).
