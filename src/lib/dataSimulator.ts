/**
 * Optional persistence for the local portfolio path — feels like a real session across reloads.
 */
import { getSamplePortfolioSnapshot } from "@/lib/mockData";

export const CLAW_WALLET_STATE_KEY = "claw_wallet_state";

type PersistedShape = ReturnType<typeof getSamplePortfolioSnapshot>;

export function loadPersistedWalletPortfolio(): PersistedShape | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(CLAW_WALLET_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedShape;
    if (
      typeof parsed?.totalValue === "number" &&
      parsed.allocation &&
      parsed.allocationByAsset &&
      Array.isArray(parsed.transactions) &&
      Array.isArray(parsed.wallets)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function savePersistedWalletPortfolio(snapshot: PersistedShape): void {
  try {
    localStorage.setItem(CLAW_WALLET_STATE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function getLocalPortfolioSnapshot(): PersistedShape {
  const persisted = loadPersistedWalletPortfolio();
  if (persisted) return persisted;
  const fresh = getSamplePortfolioSnapshot();
  savePersistedWalletPortfolio(fresh);
  return fresh;
}
