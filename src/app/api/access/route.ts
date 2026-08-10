/**
 * POST /api/access
 * Validates the beta access password and sets a persistent cookie.
 *
 * Request body: { password: string }
 * Response:
 *   200 OK  - cookie is set, user redirected client-side
 *   401     - wrong password
 *   500     - SITE_ACCESS_PASSWORD env var not configured
 */

import { NextResponse } from "next/server";

const ACCESS_COOKIE = "pakkascan_access";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function POST(request: Request) {
  const configured = process.env.SITE_ACCESS_PASSWORD;
  if (!configured) {
    return NextResponse.json(
      { error: "NOT_CONFIGURED", message: "Access gate is not configured on the server." },
      { status: 500 }
    );
  }

  let body: { password?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Request body must be JSON." },
      { status: 400 }
    );
  }

  const provided = typeof body.password === "string" ? body.password.trim() : "";
  if (!provided) {
    return NextResponse.json(
      { error: "MISSING_PASSWORD", message: "Please enter an access code." },
      { status: 400 }
    );
  }

  if (provided !== configured) {
    // Slight delay to make brute-forcing marginally slower
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json(
      { error: "ACCESS_DENIED", message: "Incorrect access code." },
      { status: 401 }
    );
  }

  // Compute cookie value (same obfuscation as middleware)
  const cookieValue = Buffer.from("pk-" + configured).toString("base64");

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}

/**
 * DELETE /api/access
 * Clears the access cookie (log out).
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
