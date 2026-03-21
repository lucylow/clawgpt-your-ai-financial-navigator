/**
 * Read-only cockpit access: user can open /app with sample data before connecting a wallet or signing in.
 * Disabled when VITE_REQUIRE_AUTH_FOR_APP=true (production gate).
 */
export const BROWSE_SESSION_KEY = "clawgpt_browse_cockpit";

export function isBrowseSessionActive(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(BROWSE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setBrowseSessionActive(): void {
  try {
    localStorage.setItem(BROWSE_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearBrowseSession(): void {
  try {
    localStorage.removeItem(BROWSE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
