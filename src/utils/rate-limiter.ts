/**
 * Rate limiter + daily spend cap.
 *
 * Two layers of protection against runaway API costs:
 *
 * 1. Per-IP rate limit
 *    - Rolling window: 10 scans/hour AND 30 scans/day per IP
 *    - Returns 429 when exceeded
 *
 * 2. Daily spend cap (global)
 *    - Rough estimate: ~£0.06 per scan (OCR + LLM extraction + next-steps + Urdu)
 *    - Cap: £5/day = ~80 scans/day globally
 *    - Returns 503 when exceeded (with reset at UTC midnight)
 *
 * NOTE: In-memory only. In serverless (Vercel) each cold-start resets counters.
 * For MVP this is fine - production scale would need Redis or Upstash.
 */

// ==========================================================
// CONFIGURATION
// ==========================================================

const PER_IP_LIMITS = {
  perHour: 10,
  perDay: 30,
};

const DAILY_SPEND_CAP_GBP = 5.0;
const ESTIMATED_COST_PER_SCAN_GBP = 0.06;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// ==========================================================
// STATE (in-memory)
// ==========================================================

type IpBucket = {
  hourlyTimestamps: number[];
  dailyTimestamps: number[];
};

const ipBuckets = new Map<string, IpBucket>();

type GlobalSpendState = {
  dateKey: string; // YYYY-MM-DD (UTC)
  scanCount: number;
};

let globalSpend: GlobalSpendState = {
  dateKey: currentUtcDateKey(),
  scanCount: 0,
};

function currentUtcDateKey(): string {
  const d = new Date();
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}

function pruneOldTimestamps(bucket: IpBucket, now: number): void {
  bucket.hourlyTimestamps = bucket.hourlyTimestamps.filter((t) => now - t < HOUR_MS);
  bucket.dailyTimestamps = bucket.dailyTimestamps.filter((t) => now - t < DAY_MS);
}

// ==========================================================
// PUBLIC API
// ==========================================================

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "ip_hourly" | "ip_daily" | "global_daily_cap"; message: string; retryAfterSeconds?: number };

/**
 * Check if this request is allowed. Call BEFORE doing any work.
 * If allowed, call recordScan() after the work completes (or fails).
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();

  // ---- Global daily spend cap ----
  // Reset counter if we've crossed into a new UTC day
  const today = currentUtcDateKey();
  if (globalSpend.dateKey !== today) {
    globalSpend = { dateKey: today, scanCount: 0 };
  }

  const estimatedSpend = globalSpend.scanCount * ESTIMATED_COST_PER_SCAN_GBP;
  if (estimatedSpend >= DAILY_SPEND_CAP_GBP) {
    // Compute retry-after: seconds until next UTC midnight
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    const retryAfterSeconds = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      reason: "global_daily_cap",
      message: "PakkaScan has reached today's scan capacity. Please try again after midnight UTC.",
      retryAfterSeconds,
    };
  }

  // ---- Per-IP rate limit ----
  let bucket = ipBuckets.get(ip);
  if (!bucket) {
    bucket = { hourlyTimestamps: [], dailyTimestamps: [] };
    ipBuckets.set(ip, bucket);
  }
  pruneOldTimestamps(bucket, now);

  if (bucket.hourlyTimestamps.length >= PER_IP_LIMITS.perHour) {
    const oldest = bucket.hourlyTimestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + HOUR_MS - now) / 1000);
    return {
      allowed: false,
      reason: "ip_hourly",
      message: "Too many scans in the last hour. Please try again in a little while.",
      retryAfterSeconds,
    };
  }

  if (bucket.dailyTimestamps.length >= PER_IP_LIMITS.perDay) {
    const oldest = bucket.dailyTimestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + DAY_MS - now) / 1000);
    return {
      allowed: false,
      reason: "ip_daily",
      message: "Daily scan limit reached for this device. Please try again tomorrow.",
      retryAfterSeconds,
    };
  }

  return { allowed: true };
}

/**
 * Record that a scan happened. Call AFTER checkRateLimit returns allowed,
 * regardless of whether the scan succeeded or failed.
 */
export function recordScan(ip: string): void {
  const now = Date.now();

  // Per-IP
  let bucket = ipBuckets.get(ip);
  if (!bucket) {
    bucket = { hourlyTimestamps: [], dailyTimestamps: [] };
    ipBuckets.set(ip, bucket);
  }
  bucket.hourlyTimestamps.push(now);
  bucket.dailyTimestamps.push(now);

  // Global
  const today = currentUtcDateKey();
  if (globalSpend.dateKey !== today) {
    globalSpend = { dateKey: today, scanCount: 0 };
  }
  globalSpend.scanCount += 1;
}

/**
 * Extract client IP from a Next.js request.
 * Handles proxy headers (x-forwarded-for), falls back to a fixed key.
 */
export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // May be a comma-separated list; take the first (original client)
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // Fallback: treat all unknown IPs as one bucket (still rate-limited together)
  return "unknown";
}

/**
 * Debug utility: current global spend state (for logging / admin).
 */
export function getGlobalSpendState(): { dateKey: string; scanCount: number; estimatedSpendGbp: number; capGbp: number } {
  return {
    dateKey: globalSpend.dateKey,
    scanCount: globalSpend.scanCount,
    estimatedSpendGbp: Number((globalSpend.scanCount * ESTIMATED_COST_PER_SCAN_GBP).toFixed(2)),
    capGbp: DAILY_SPEND_CAP_GBP,
  };
}
