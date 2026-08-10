/**
 * GET /api/auth/verify?token=<raw>
 *
 * User clicked the magic link in their email. We:
 * 1. Hash the raw token and look up the magic_links row
 * 2. Validate not expired, not consumed
 * 3. Mark consumed
 * 4. Find or create the user
 * 5. Create a session, set cookie
 * 6. Redirect to home
 */

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE_SECONDS } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawToken = url.searchParams.get("token");

  if (!rawToken || rawToken.length < 32) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const links = await sql`
    SELECT id, email, expires_at, consumed_at
    FROM magic_links
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  ` as Array<{ id: string; email: string; expires_at: string; consumed_at: string | null }>;

  if (links.length === 0) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
  }
  const link = links[0];

  if (link.consumed_at) {
    return NextResponse.redirect(new URL("/login?error=link_used", request.url));
  }
  if (new Date(link.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/login?error=link_expired", request.url));
  }

  await sql`UPDATE magic_links SET consumed_at = NOW() WHERE id = ${link.id}`;

  const email = link.email.toLowerCase();
  const users = await sql`
    SELECT id, email FROM users WHERE LOWER(email) = ${email} LIMIT 1
  ` as Array<{ id: string; email: string }>;

  let userId: string;
  if (users.length === 0) {
    const inserted = await sql`
      INSERT INTO users (email, email_verified_at, last_login_at)
      VALUES (${email}, NOW(), NOW())
      RETURNING id
    ` as Array<{ id: string }>;
    userId = inserted[0].id;
    console.log("[auth/verify] Created new user " + email);
  } else {
    userId = users[0].id;
    await sql`
      UPDATE users
      SET last_login_at = NOW(),
          email_verified_at = COALESCE(email_verified_at, NOW())
      WHERE id = ${userId}
    `;
    console.log("[auth/verify] Existing user logged in: " + email);
  }

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;
  const userAgent = request.headers.get("user-agent") || null;
  const { token } = await createSession({ userId, email, ipAddress, userAgent });

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
