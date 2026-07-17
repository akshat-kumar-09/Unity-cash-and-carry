type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Only runs while this serverless instance stays warm — periodic cleanup just keeps a
// long-lived instance from accumulating stale keys forever, it's not correctness-critical.
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, 5 * 60 * 1000)
cleanupTimer.unref?.()

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number }

/**
 * In-memory sliding-window limiter, keyed by caller. Only as strong as the warm instance
 * it runs in (no shared store across instances) — not a substitute for Redis at real
 * scale, but a meaningful bar against brute-force/spam for a small trade-account app.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  bucket.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "unknown"
}
