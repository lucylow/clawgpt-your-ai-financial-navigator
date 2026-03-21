/**
 * Must match Vite `base` — `import.meta.env.BASE_URL` is derived from `vite.config` `base`
 * (e.g. `/` or `/my-app/`). Used so React Router and static assets stay aligned when the app
 * is served under a subpath (some Lovable previews / external hosts).
 */
export function getRouterBasename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (base === "/" || base === "") return undefined;
  const trimmed = base.replace(/\/$/, "");
  return trimmed.length > 0 ? trimmed : undefined;
}
