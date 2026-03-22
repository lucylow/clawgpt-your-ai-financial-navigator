# Agent Wallets track — quick verification

- [x] OpenClaw-style planner produces structured tool steps (`OpenClawAgent`, optional LLM JSON when `AGENT_LLM_API_KEY` is set).
- [x] WDK path: mnemonic → `@tetherto/wdk` + chain wallet modules (`createWdkFromMnemonic`, `WalletService`).
- [x] Safety: per-tx / daily limits, recipient allowlist, confirm gate (`SafetyService`).
- [x] Plans require HTTP `POST /api/agent/confirm` or Socket.IO `agent:confirm` after risky proposals.
- [x] Background autonomy: `AUTONOMY_CRON_ENABLED=1` + `autonomyOptIn` on user — idle USD₮ threshold (10) with hourly throttle (`src/jobs/autonomyScheduler.ts`).

## Run

1. `docker compose up -d` (Postgres) or supply your own `DATABASE_URL`.
2. `cd backend && cp .env.testnet.example .env` — fill `JWT_SECRET`, `BACKEND_ENCRYPTION_KEY_HEX`, testnet token addresses for transfers.
3. `npm i && npx prisma db push && npm run dev`
4. `POST /api/auth/register` → `POST /api/wallets` → fund Sepolia → `POST /api/agent/message` with send intent → `POST /api/agent/confirm`.
