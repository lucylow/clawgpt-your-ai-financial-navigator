/**
 * Security model (early-stage): boundaries between layers.
 *
 * - **React Query** — server/API responses, caching, refetch. No signing keys.
 * - **Local / Zustand UI stores** — shell: sidebar, chat layout, demo toggles. Not authoritative for balances.
 * - **Wallet (WDK)** — signing context and on-chain execution entry points only through `walletClient` / explicit UI confirmation.
 * - **Contracts** — Solidity under `/contracts`; ABI fragments under `/contracts/abis`. App imports read-only config from `src/config/contracts.ts`.
 */

/** Intent object required for any on-chain send — prevents silent programmatic authorization. */
export type UserConfirmedChainIntent = {
  kind: "user_confirmed";
  /** Wall-clock ms when the user clicked confirm in UI (must be set at interaction time). */
  confirmedAtMs: number;
};

export function createUserConfirmedIntent(): UserConfirmedChainIntent {
  return { kind: "user_confirmed", confirmedAtMs: Date.now() };
}
