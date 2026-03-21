/**
 * Returns a safe in-app path after auth. Rejects open redirects and external URLs.
 */
export function safePostAuthRedirectPath(redirectParam: string | null | undefined): string {
  const fallback = "/app";
  if (redirectParam == null || redirectParam === "") return fallback;
  try {
    const decoded = decodeURIComponent(redirectParam.trim());
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
    if (decoded.includes("://")) return fallback;
    if (decoded.includes("..")) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}
