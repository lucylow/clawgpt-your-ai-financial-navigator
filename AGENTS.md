# Agent and contributor guidance (ClawGPT + WDK)

This repository integrates **Tether Wallet Development Kit (WDK)** for multi-chain, self-custodial flows. Treat official documentation as the source of truth before changing wallet behavior.

## Documentation first

- **WDK SDK overview and registration model:** [docs.wdk.tether.io/sdk](https://docs.wdk.tether.io/sdk)
- **Architecture in this repo:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/WDK.md](./docs/WDK.md), [docs/BACKEND.md](./docs/BACKEND.md)

When adding or changing a chain, protocol, or wallet feature: read the relevant WDK page (wallet modules, quickstart for your stack), note the **exact `@tetherto/wdk-*` package name**, then update `src/lib/wdkRegistry.ts` and dependencies together.

## Layering (non-negotiable)

| Concern | Location |
|--------|----------|
| User intent, plans, clarification | Agent / `agent-chat` edge — **no signing** |
| Policy, guardrails, previews | `supabase/functions/_shared/*`, `src/lib/agentSafety.ts` |
| WDK orchestration and token operations | `src/lib/wdkClient.ts` (`ClawWdkBridge`) |
| Stable facade for UI and stores | `src/lib/walletClient.ts` |
| Capability and package mapping | `src/lib/wdkRegistry.ts` |

Write operations **must** go through `walletClient.sendTransaction` with `UserConfirmedChainIntent` — never bypass confirmation for broadcasts.

## Package naming

- Core: `@tetherto/wdk`
- This project’s wallet modules: see `CHAIN_WALLET_REGISTRY` in `src/lib/wdkRegistry.ts` (must match `package.json`).

## Tests

Run `npm test` after touching registry, wallet, or policy code. Add unit tests for new capability rules in `src/lib/wdkRegistry.test.ts` (or adjacent `*.test.ts`).
