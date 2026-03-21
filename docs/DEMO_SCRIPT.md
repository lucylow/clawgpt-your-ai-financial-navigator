# Demo script (2–3 minutes)

Use this for hackathon judging. **Testnet / demo mode** — balances and txs are simulated unless wired to live infra.

## Prep (~30s)

1. `npm install && npm run dev` (default [http://localhost:8080](http://localhost:8080)).
2. Open landing page → note **Launch app** and testnet copy.
3. Sign in via `/auth` if your build requires it (mock/demo may allow session).

## Flow A — Cockpit split (~45s)

1. Go to **Dashboard** (`/app`).
2. Point out **left ~40%**: chat with **Claw**; **right ~60%**: globe, portfolio card, charts, ticker.
3. Header: **ClawGPT**, **Testnet · 6 chains**, **Demo mode** badge.

## Flow B — Chat + dashboard reaction (~60s)

1. Type: **What’s my total portfolio?** → assistant answers using store totals.
2. Type: **Send 50 USDT to Sarah** → **transaction ready** card → **Confirm** (mock) → new row in ticker / tx list.
3. Type: **You have idle USDT on Ethereum** or **move to Arbitrum** → **opportunity** card.

## Flow C — Recurring buy (~30s)

1. Type: **Set up a recurring buy** → wizard-style steps appear; click through **Next** / **Done** (mock).

## Closing line

> “Agent integration is centralized in `lib/agentClient.ts`; wallet operations will go through `lib/walletClient.ts` for Tether WDK with no raw keys in source.”
