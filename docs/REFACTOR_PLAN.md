# ClawGPT Financial Cockpit — Refactor Plan

This document tracks the evolution of `clawgpt-your-ai-financial-navigator` toward the **ClawGPT Financial Cockpit** vision: split-screen agent chat (OpenClaw-style) + real-time dashboard (globe, charts, ticker), with clear boundaries for **agent** (`lib/agentClient.ts`) and **wallet / WDK** (`lib/walletClient.ts`).

## Current state (audit snapshot)

| Area | Finding |
|------|---------|
| **Framework** | Vite 5 + React 18 + TypeScript, `react-router-dom` v6 |
| **Styling** | Tailwind + shadcn/ui + `glass-card` patterns in CSS |
| **Routing** | `/` landing, `/auth`, `/app/*` protected `CockpitLayout` with nested routes |
| **Chat / agent** | `ChatInterface` → `lib/agentClient.ts` `sendMessage` (mock by default; optional `streamAgentMessage` in `lib/agent.ts`); portfolio updates via `applyAgentUpdate` |
| **State** | Zustand: `usePortfolioStore` (+ wallets, `agent` slice), `useUIStore`; React Query at root |
| **Pain points (remaining)** | Cmd+K palette; stricter TypeScript; real `portfolioUpdate` shape from edge function; WDK in `walletClient`; fewer `any` in Supabase inserts |

## Target architecture (directional)

```text
src/
├── components/
│   ├── chat/              # ChatInterface, MessageList, MessageBubble, MessageInput
│   ├── cockpit/           # Globe, dashboard panels, ticker (presentational)
│   └── ui/                # shadcn primitives
├── hooks/
│   ├── usePortfolio.ts    # Store + refresh / simulated stream
│   └── useAuth.tsx
├── lib/
│   ├── agent.ts           # Low-level Supabase stream + persistence (keep)
│   ├── agentClient.ts     # Single entry: sendMessage → { text, cards?, portfolioUpdate? }
│   └── walletClient.ts    # WDK / signing boundary (stubs + TODOs)
├── store/
│   ├── usePortfolioStore.ts
│   └── useUIStore.ts
└── pages/
```

Backend organization today: Supabase (`integrations/supabase`, `supabase/functions/agent-chat`). Future: optional `backend/` or more edge functions without rewriting the UI if `agentClient` stays the only caller from the chat layer.

## Prioritized checklist (1–3 hour batches)

### Done (this iteration)

- [x] Add `docs/REFACTOR_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/DEMO_SCRIPT.md`
- [x] Tighten `README.md` quick start and Cockpit positioning
- [x] Introduce `lib/agentClient.ts` with **mock-first** responses + optional real Supabase path via `VITE_USE_MOCK_AGENT`
- [x] Introduce `lib/walletClient.ts` stubs and security TODOs
- [x] Extend portfolio store: wallets, nested allocation hints, `agent` slice
- [x] Split chat UI: `MessageList`, `MessageBubble`, `MessageInput`, `ChatInterface`
- [x] Dashboard split **~40% / ~60%**; header branding + demo / testnet labels

### Next iterations (highest impact first)

1. **Rich cards UX** — Confirm/cancel flows wired to portfolio optimistic updates for every card type; optional Cmd+K palette using existing `command` UI.
2. **Real agent path** — Normalize `portfolioUpdate` shapes from `agent-chat` to match `AgentPortfolioUpdate` in `agentClient`; add integration tests.
3. **WDK** — Implement `walletClient` methods behind feature flags; never persist raw keys (see `walletClient` comments).
4. **Strict TypeScript** — Enable `strict` incrementally; remove `any` from store and Supabase inserts.
5. **Landing** — Screenshots/GIFs in README; optional lighter hero motion for performance.

## How to update this file

After each merged chunk, tick items under **Done** or add a dated **Changelog** subsection with 2–3 bullets.

---

*Last updated: initial Cockpit alignment pass.*
