/**
 * PD-036 — Security response headers and request guards.
 */

export type SecurityHeaders = Record<string, string>;

export function productionSecurityHeaders(): SecurityHeaders {
  return {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "cache-control": "no-store",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  };
}

export function assertSafeJsonContentType(contentType: string | undefined): void {
  if (!contentType) return;
  const base = contentType.split(";")[0]!.trim().toLowerCase();
  if (base !== "application/json" && base !== "application/problem+json") {
    throw new Error("UNSUPPORTED_CONTENT_TYPE");
  }
}

export function assertBearerPresent(authorization: string | undefined): string {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED");
  }
  const token = authorization.slice(7).trim();
  if (!token) throw new Error("UNAUTHENTICATED");
  return token;
}

export function redactSecrets(value: string): string {
  return value
    .replace(/(Bearer\s+)[A-Za-z0-9._\-]+/gi, "$1[REDACTED]")
    .replace(/(password["']?\s*[:=]\s*["']?)[^"',\s]+/gi, "$1[REDACTED]")
    .replace(/(secret["']?\s*[:=]\s*["']?)[^"',\s]+/gi, "$1[REDACTED]")
    .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[^"',\s]+/gi, "$1[REDACTED]");
}
