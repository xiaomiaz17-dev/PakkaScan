/**
 * PD-036 — Fixed-window rate limiter.
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
};

export class FixedWindowRateLimiter {
  private readonly hits = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {
    if (limit < 1) throw new Error("limit must be positive");
    if (windowMs < 1) throw new Error("windowMs must be positive");
  }

  attempt(key: string, now = Date.now()): RateLimitResult {
    const current = this.hits.get(key);
    if (!current || now - current.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: this.limit - 1 };
    }
    if (current.count >= this.limit) {
      const retryAfterSeconds = Math.ceil((this.windowMs - (now - current.windowStart)) / 1000);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }
    current.count += 1;
    return { allowed: true, remaining: this.limit - current.count };
  }

  reset(): void {
    this.hits.clear();
  }
}
