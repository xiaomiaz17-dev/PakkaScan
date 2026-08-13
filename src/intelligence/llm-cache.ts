/**
 * In-memory LRU cache for LLM responses.
 *
 * Purpose: avoid re-calling Gemini for the same input.
 *
 * Cache key = SHA-256 of (namespace + PROMPT_VERSION + input text)
 * - namespace: separates extractor / next-steps / urdu / cross-doc caches
 * - PROMPT_VERSION: bumped whenever any LLM prompt is edited (auto-invalidates old entries)
 * - input text: OCR text, document type, or whatever is unique to the request
 *
 * TTL: 24 hours (documents don't change; but avoid indefinite stale data)
 * Max size: 200 entries per namespace (evicts oldest when full)
 *
 * NOTE: This is process-memory only. In a serverless deployment (Vercel),
 * each cold-start gets a fresh cache. That's fine - the goal is to save cost
 * within a session, not to build a global cache. Serverless warms rapidly.
 */

import { createHash } from "node:crypto";

/**
 * BUMP THIS when any LLM prompt changes.
 * Old cache entries become invisible (they will silently expire).
 * Format: YYYYMMDD-N (date + iteration within that day).
 */
export const PROMPT_VERSION = "20260811-2";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES_PER_NAMESPACE = 200;

type CacheEntry<T> = {
  value: T;
  storedAt: number;
};

const caches = new Map<string, Map<string, CacheEntry<any>>>();

function getNamespaceCache(namespace: string): Map<string, CacheEntry<any>> {
  let ns = caches.get(namespace);
  if (!ns) {
    ns = new Map();
    caches.set(namespace, ns);
  }
  return ns;
}

/**
 * Build a stable cache key.
 */
function buildKey(namespace: string, ...inputs: string[]): string {
  const hash = createHash("sha256");
  hash.update(namespace);
  hash.update("|");
  hash.update(PROMPT_VERSION);
  for (const input of inputs) {
    hash.update("|");
    hash.update(input || "");
  }
  return hash.digest("hex");
}

/**
 * Retrieve from cache. Returns undefined if not present or expired.
 */
export function cacheGet<T>(namespace: string, ...inputs: string[]): T | undefined {
  const ns = getNamespaceCache(namespace);
  const key = buildKey(namespace, ...inputs);
  const entry = ns.get(key);
  if (!entry) return undefined;

  const ageMs = Date.now() - entry.storedAt;
  if (ageMs > CACHE_TTL_MS) {
    ns.delete(key);
    return undefined;
  }

  // LRU: refresh position by delete+set
  ns.delete(key);
  ns.set(key, entry);

  return entry.value as T;
}

/**
 * Store in cache. Evicts oldest entry if namespace is full.
 */
export function cacheSet<T>(namespace: string, value: T, ...inputs: string[]): void {
  const ns = getNamespaceCache(namespace);
  const key = buildKey(namespace, ...inputs);

  // Evict oldest if at capacity
  if (ns.size >= MAX_ENTRIES_PER_NAMESPACE && !ns.has(key)) {
    const oldestKey = ns.keys().next().value;
    if (oldestKey) ns.delete(oldestKey);
  }

  ns.set(key, { value, storedAt: Date.now() });
}

/**
 * Debug utility: stats per namespace.
 * Not used in production; handy for logging.
 */
export function cacheStats(): Record<string, { entries: number }> {
  const stats: Record<string, { entries: number }> = {};
  for (const [ns, cache] of caches.entries()) {
    stats[ns] = { entries: cache.size };
  }
  return stats;
}

/**
 * Clear all caches. For testing or manual reset.
 */
export function cacheClear(): void {
  caches.clear();
}
