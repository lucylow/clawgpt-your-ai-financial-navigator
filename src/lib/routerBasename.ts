/**
 * Must match Vite `base` — `import.meta.env.BASE_URL` is derived from `vite.config` `base`
 * (e.g. `/` or `/my-app/`). Used so React Router and static assets stay aligned when the app
 * is served under a subpath (some Lovable previews / external hosts).
 */
export function getRouterBasename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  // Root or relative asset base (`./`) — no router basename (matches Lovable / Vite defaults).
  if (base === "/" || base === "" || base === "./") return undefined;
  const trimmed = base.replace(/\/$/, "");
  if (trimmed === "." || trimmed === "") return undefined;
  return trimmed.length > 0 ? trimmed : undefined;
}
