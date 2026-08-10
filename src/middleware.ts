/**
 * Route protection middleware.
 *
 * PROTECTED: /api/beta/* (scan API). Requires a valid auth session cookie.
 *
 * PUBLIC: everything else (homepage, /login, /api/auth/*, static assets).
 *
 * The scan page itself (/) is public so visitors can see what PakkaScan is,
 * but attempting a scan (POST /api/beta/scan) requires being signed in.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

const PROTECTED_PATH_PREFIXES = ["/api/beta"];

function isProtected(pathname: string): boolean {
  for (const prefix of PROTECTED_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);
  if (session) {
    return NextResponse.next();
  }

  // Not signed in - block scan API
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "NOT_SIGNED_IN", message: "Please sign in to use PakkaScan." },
      { status: 401 }
    );
  }

  // For pages (defensive - no protected pages currently), redirect to /login
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|.well-known).*)",
  ],
};
