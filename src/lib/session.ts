/**
 * Session management.
 *
 * Sessions are stored in the DB (sessions table) AND represented
 * as a signed JWT in an httpOnly cookie. Two-layer approach:
 *
 * 1. Cookie contains: signed JWT with { sessionId, userId }
 * 2. DB row contains: full session state (created, expires, IP, UA)
 *
 * On every request, middleware verifies JWT signature quickly.
 * API routes that need the user re-check DB for revocation.
 */

import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { sql } from "./db";

const COOKIE_NAME = "pakkascan_session";
const SESSION_DURATION_DAYS = 30;
const SESSION_DURATION_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

export type SessionPayload = {
  sessionId: string;
  userId: string;
  email: string;
};

/**
 * Get the signing secret. We reuse SITE_ACCESS_PASSWORD if
 * SESSION_SECRET is not set (dev convenience), else prefer SESSION_SECRET.
 * In production always set SESSION_SECRET explicitly.
 */
function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.SITE_ACCESS_PASSWORD;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set and at least 16 chars long");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign a session JWT.
 */
export async function signSessionJwt(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_DURATION_MS / 1000)
    .sign(getSecret());
}

/**
 * Verify a session JWT. Returns null if invalid or expired.
 */
export async function verifySessionJwt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sessionId !== "string" || typeof payload.userId !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return {
      sessionId: payload.sessionId,
      userId: payload.userId,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

/**
 * Get current session from cookies (Next.js server component / route handler).
 * Returns null if no valid session cookie present.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionJwt(token);
}

/**
 * Get session from a NextRequest (used inside middleware).
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionJwt(token);
}

/**
 * Create a new session in the DB and return the cookie-ready JWT.
 */
export async function createSession(input: {
  userId: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const rows = await sql`
    INSERT INTO sessions (user_id, expires_at, ip_address, user_agent)
    VALUES (${input.userId}, ${expiresAt.toISOString()}, ${input.ipAddress}, ${input.userAgent})
    RETURNING id
  ` as Array<{ id: string }>;
  const sessionId = rows[0].id;
  const token = await signSessionJwt({ sessionId, userId: input.userId, email: input.email });
  return { token, expiresAt };
}

/**
 * Revoke a session (delete DB row). Cookie remains until expiry but
 * subsequent DB checks will find no matching session.
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_COOKIE_MAX_AGE_SECONDS = Math.floor(SESSION_DURATION_MS / 1000);
