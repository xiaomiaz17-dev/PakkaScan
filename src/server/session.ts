/**
 * Secure session cookie helpers for the Next.js customer surface.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "pakkadeed_session";
export const CSRF_COOKIE = "pakkadeed_csrf";
export const CSRF_HEADER = "x-csrf-token";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
};

export function sessionCookieOptions(secure = process.env.NODE_ENV === "production"): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function csrfCookieOptions(secure = process.env.NODE_ENV === "production"): CookieOptions {
  return {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function createCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

export function assertCsrf(cookieToken: string | undefined, headerToken: string | undefined): void {
  if (!cookieToken || !headerToken) throw new Error("CSRF_FAILED");
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("CSRF_FAILED");
}

export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    out[key] = value;
  }
  return out;
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

export function clearCookie(name: string, secure = process.env.NODE_ENV === "production"): string {
  return serializeCookie(name, "", {
    httpOnly: name === SESSION_COOKIE,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
