/** Simple sliding-window rate limiter: max N requests per windowMs per key (e.g. IP). */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export function rateLimitKey(req: { socket?: { remoteAddress?: string } }): string {
  return req.socket?.remoteAddress ?? "unknown";
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) {
    b = { timestamps: [] };
    buckets.set(key, b);
  }
  const cutoff = now - windowMs;
  b.timestamps = b.timestamps.filter((t) => t > cutoff);
  if (b.timestamps.length >= maxRequests) {
    const oldest = b.timestamps[0] ?? now;
    return { ok: false, retryAfterMs: Math.max(0, windowMs - (now - oldest)) };
  }
  b.timestamps.push(now);
  return { ok: true };
}
