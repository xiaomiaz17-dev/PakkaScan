/**
 * GET /api/auth/session
 *   Returns the current user email + userId, or 401 if not signed in.
 *
 * DELETE /api/auth/session
 *   Logs the user out. Revokes the session in DB and clears the cookie.
 */

import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession, revokeSession, SESSION_COOKIE_NAME } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const rows = await sql`
    SELECT s.id, s.expires_at, u.email, u.name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${session.sessionId}
      AND s.expires_at > NOW()
    LIMIT 1
  ` as Array<{ id: string; expires_at: string; email: string; name: string | null }>;

  if (rows.length === 0) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  await sql`UPDATE sessions SET last_seen_at = NOW() WHERE id = ${session.sessionId}`;

  return NextResponse.json({
    authenticated: true,
    user: {
      email: rows[0].email,
      name: rows[0].name,
    },
  });
}

export async function DELETE() {
  const session = await getSession();
  if (session) {
    try {
      await revokeSession(session.sessionId);
    } catch (err) {
      console.warn("[auth/session] revoke failed:", err);
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
