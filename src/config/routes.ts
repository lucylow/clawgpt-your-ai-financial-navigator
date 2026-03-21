/**
 * Public vs cockpit route map. Marketing and auth stay public; `/app` and below require a session
 * (or an explicit non-production bypass — see `ProtectedRoute` / env).
 */
export const COCKPIT_APP_BASE = "/app";

/** Paths that never require Supabase session (basename-aware callers should pass normalized paths). */
export const PUBLIC_PATH_PREFIXES = ["/", "/auth"] as const;

export function isCockpitPath(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? pathname;
  return p === COCKPIT_APP_BASE || p.startsWith(`${COCKPIT_APP_BASE}/`);
}

export function isPublicMarketingPath(pathname: string): boolean {
  const p = pathname.split("?")[0] ?? pathname;
  for (const prefix of PUBLIC_PATH_PREFIXES) {
    if (prefix === "/") {
      if (p === "/") return true;
    } else if (p === prefix || p.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}
