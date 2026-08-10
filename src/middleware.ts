/**
 * Beta access password gate.
 *
 * Runs on every request. If the visitor does not have a valid
 * pakkascan_access cookie, they are redirected to /access to enter
 * the shared beta password.
 *
 * PUBLIC (no password required):
 *   - / (marketing home page)
 *   - /access (the password entry page itself)
 *   - /api/access (POST endpoint to validate password)
 *   - Static assets (_next, fonts, images, etc.)
 *   - Sentry / observability endpoints
 *
 * PROTECTED (password required):
 *   - /app/scan (the product)
 *   - /api/beta/scan (the scan API)
 *   - Any /app/* or /api/beta/* routes
 *
 * This is a temporary beta gate. Real per-user auth + payment
 * will replace it before public launch.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "pakkascan_access";
const PROTECTED_PATH_PREFIXES = ["/app", "/api/beta"];

/**
 * The cookie stores a signed access token. We keep it simple:
 * the cookie value is a hash of the password. On every request,
 * we compute the current expected hash from the env var and compare.
 * If the env var password changes, all existing cookies invalidate.
 */
function expectedCookieValue(): string | null {
  const pw = process.env.SITE_ACCESS_PASSWORD;
  if (!pw) return null;
  // Simple obfuscation - not cryptographic security, just to avoid
  // sending the raw password in the cookie value.
  // Base64 of a fixed prefix + password. In production auth this would
  // be a signed JWT or session token.
  return Buffer.from("pk-" + pw).toString("base64");
}

function isProtected(pathname: string): boolean {
  for (const prefix of PROTECTED_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If SITE_ACCESS_PASSWORD is not set (e.g. local dev), let everything through.
  // This makes local dev not require the password.
  const expected = expectedCookieValue();
  if (!expected) {
    return NextResponse.next();
  }

  // Not a protected route - let through.
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  // Protected route - check cookie
  const cookieValue = request.cookies.get(ACCESS_COOKIE)?.value;
  if (cookieValue === expected) {
    return NextResponse.next();
  }

  // Missing or invalid cookie
  // For API routes, return 401 JSON instead of redirect
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "BETA_ACCESS_REQUIRED", message: "This endpoint requires beta access. Visit /access to enter your access code." },
      { status: 401 }
    );
  }

  // For pages, redirect to /access with a return URL
  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("returnTo", pathname);
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: [
    // Run on all routes EXCEPT:
    // - _next static assets
    // - _next/image (image optimization)
    // - favicon.ico
    // - manifest.json / sw.js
    // - .well-known (Vercel/ACME challenges)
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|.well-known).*)",
  ],
};
