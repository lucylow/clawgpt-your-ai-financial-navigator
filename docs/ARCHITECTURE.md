# ClawGPT architecture (engineering overview)

This document complements [BACKEND.md](./BACKEND.md) with a **whole-product** view: runtime, layering, contracts, and where to change behavior safely.

## Runtime and tooling

| Area | Choice |
|------|--------|
| UI | React 18, Vite 5, TypeScript |
| Routing | `react-router-dom` v6 |
| Styling | Tailwind + shadcn-style primitives |
| Client state | Zustand (`src/store/*`), TanStack Query where applicable |
| Validation | Zod (browser + Deno edge) |
| Backend (chat / tools) | Supabase Edge Functions (`supabase/functions/agent-chat`) |
| Wallet / chains | `@tetherto/wdk` and chain adapters in the **browser** (`src/lib/wdkClient.ts`, `walletClient.ts`) — keys stay client-side |
| Tests | Vitest (unit), Playwright (e2e) |

## Layer boundaries

| Layer | Location | Responsibility |
|--------|-----------|----------------|
| **Presentation** | `src/components/*`, `src/pages/*` | Layout, cockpit panels, chat UI, 3D globe — **no** direct WDK calls in leaf components; prefer hooks and services. |
| **Application** | `src/lib/agentClient.ts`, `src/lib/agent.ts` | Orchestrates chat turns, maps streaming responses to UI cards and store updates. |
| **Domain / policy** | `src/lib/economics/*`, `src/lib/agentWorkflow.ts`, `supabase/functions/_shared/guardrails.ts`, `policyEngine.ts` | Rules for spend, bridges, slippage, audits — **deterministic** where possible. |
| **Infrastructure** | `src/lib/wdkClient.ts`, `src/lib/supabaseEnv.ts`, Supabase client, observability | Env, HTTP to edge, WDK, optional ingest URL. |
| **Shared contracts** | `src/types/index.ts`, `src/contracts/*`, `supabase/functions/_shared/schemas.ts`, `types.ts`, `events.ts` | DTOs, Zod request bodies, error shapes, SSE event v1. |

**Rule of thumb:** presentation imports application + contracts; application imports domain helpers + infrastructure; domain does not import React or WDK.

## Agent and chat data flow

1. User message → `sendMessage` (`agentClient.ts`) → `streamAgentMessage` (`agent.ts`) → `POST` Supabase `agent-chat`.
2. Request body is validated on the edge with `agentChatRequestSchema` (`_shared/schemas.ts`). Optional `correlationId` and `idempotencyKey` are supported; the client also sends **`X-Correlation-Id`** (and **`X-Idempotency-Key`** when present) for tracing.
3. Responses: SSE with leading `metadata` line and/or JSON fallbacks. Tool results and safety envelopes are merged in `serve.ts` / `toolExecutor.ts`.
4. **Structured errors** from the edge match `BackendErrorBody` in `supabase/functions/_shared/types.ts`. The web app parses the same shape with `src/contracts/agentBackendError.ts` so failures are **typed**, not string-only.

## Wallet execution

- **Preview / policy / simulation:** edge tools + client-side safety envelopes (`agentSafety`).
- **Signing / broadcast:** only via WDK in the browser, never inside the edge function.
- **WDK packages and capability matrix:** [WDK.md](./WDK.md) and `src/lib/wdkRegistry.ts` (docs-first; do not hardcode chain support in UI).

## Observability

- Client: `src/lib/observability.ts` (errors, interactions, chain phases, Web Vitals, optional ingest).
- Agent turns: `trackAgentChatTurn` records success/failure and latency for live `agent-chat` calls (mock agent bypasses this path).

## Local development

- Frontend: `npm run dev`
- Edge function: Supabase CLI `functions serve` with `LOVABLE_API_KEY` (see [BACKEND.md](./BACKEND.md))
- Tests: `npm test`

## Configuration

See root `.env.example` for `VITE_*` variables. Server secrets (`LOVABLE_API_KEY`) are **not** prefixed with `VITE_` and are set on Supabase for `agent-chat` only.
