/**
 * In-memory sliding-window rate limiter.
 *
 * Trade-offs:
 * - Zero deps, works on any Node runtime, ships today.
 * - Per-instance memory — resets on redeploy, doesn't sync across
 *   multiple server instances. For a small MSME app this is fine;
 *   move to Upstash Redis if you scale to multiple regions.
 * - Buckets by an arbitrary key (IP for anon endpoints, user id for authed).
 */

type Bucket = { hits: number[]; };

const BUCKETS = new Map<string, Bucket>();
const MAX_KEYS = 5000; // hard cap so memory doesn't grow unbounded

export interface RateLimitConfig {
  /** Human-readable namespace, mixed into the key (e.g. "chat", "gendoc"). */
  scope: string;
  /** Max hits allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetInMs: number;
}

export function rateLimit(
  identifier: string,
  cfg: RateLimitConfig
): RateLimitResult {
  const key = `${cfg.scope}:${identifier}`;
  const now = Date.now();
  const windowStart = now - cfg.windowMs;

  // Opportunistic pruning if the map grows too large.
  if (BUCKETS.size > MAX_KEYS) {
    for (const [k, b] of BUCKETS) {
      if (!b.hits.some((t) => t > windowStart)) BUCKETS.delete(k);
      if (BUCKETS.size <= MAX_KEYS * 0.8) break;
    }
  }

  let bucket = BUCKETS.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    BUCKETS.set(key, bucket);
  }

  // Drop hits that fell out of the window.
  bucket.hits = bucket.hits.filter((t) => t > windowStart);

  if (bucket.hits.length >= cfg.limit) {
    const oldest = bucket.hits[0];
    return {
      ok: false,
      remaining: 0,
      resetInMs: Math.max(0, oldest + cfg.windowMs - now),
    };
  }

  bucket.hits.push(now);
  return {
    ok: true,
    remaining: cfg.limit - bucket.hits.length,
    resetInMs: cfg.windowMs,
  };
}

/**
 * Extract a client identifier from a request. Uses x-forwarded-for
 * (set by Vercel/most reverse proxies), falls back to x-real-ip, then
 * to a fixed string (so a limit still applies even if headers are missing).
 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
