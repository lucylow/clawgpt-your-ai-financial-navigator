# ClawGPT backend architecture

The production chat and financial reasoning path for the cockpit is implemented as a **Supabase Edge Function** (`supabase/functions/agent-chat`). The browser talks to it over HTTPS; wallet signing and WDK usage stay in the client (`src/lib/wdkClient.ts`).

## Layering (enforced in code)

| Layer | Location | Responsibility |
|--------|-----------|------------------|
| API / transport | `agent-chat/index.ts`, `_shared/serve.ts` | HTTP, CORS, request validation, correlation IDs, error shape |
| Agent orchestration | Lovable AI gateway + system prompt | Intent → tool calls → follow-up stream |
| Tool execution (demo / guardrails) | `_shared/toolExecutor.ts` | Deterministic tool results, previews, safety envelopes |
| Domain rules | `_shared/guardrails.ts`, `_shared/policyEngine.ts` | Risk %, spend policy, protocol allowlist |
| Contracts | `_shared/types.ts`, `_shared/schemas.ts` | Shared DTOs, Zod request schema, event v1 shape |
| Contracts (web) | `src/contracts/agentBackendError.ts` | Zod parse for `BackendErrorBody`-shaped JSON from `agent-chat` |

Wallet private keys and seed phrases **never** pass through this function.

## Environment

| Variable | Required | Purpose |
|----------|-----------|---------|
| `LOVABLE_API_KEY` | Yes (deployed) | AI gateway for Gemini + tool calling |

Set secrets with Supabase CLI or dashboard for the `agent-chat` function.

## Request contract

`POST` JSON body (validated with Zod in `_shared/schemas.ts`):

- `message` (string, required)
- `history` (optional array of `{ role, content }`, max 50 entries; only the last 20 are forwarded)
- `correlationId` (optional string, 8–128 chars) — trace id for chat → tool → UI
- `idempotencyKey` (optional) — echoed in response headers for client-side deduplication

Responses include `X-Correlation-Id`. Structured errors return JSON with `error`, `code`, `category`, `recoverable`, `correlationId` (see `_shared/types.ts`).

## Realtime events

When tools run, the SSE stream sends an initial `data:` line with `metadata` containing:

- `contractContext`, `portfolioPreview`, `safety` (unchanged)
- `events`: versioned `AgentEventV1` entries (`_shared/events.ts`)
- `correlationId`

The React client merges these into `AgentMetadata` in `src/lib/agent.ts`.

## Local development

- Frontend: `npm run dev`
- Edge function: use Supabase CLI `supabase functions serve` with project secrets, or deploy to a dev project.

## Tests

Vitest includes unit tests under `supabase/functions/_shared/*.test.ts` (guardrails, address validation, policy). Run `npm test`.

## WDK

On-chain execution uses `@tetherto/wdk` in the browser. The edge function only returns **previews** and **structured safety envelopes**; it does not broadcast transactions.
