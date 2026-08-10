import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { BetaUser, Session, UserRole } from "./types";

const hash = (v: string) => createHash("sha256").update(v).digest("hex");

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  if (password.length < 10) throw new Error("PASSWORD_TOO_SHORT");
  return `${salt}:${hash(`${salt}:${password}`)}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const actual = Buffer.from(hash(`${salt}:${password}`));
  const expected = Buffer.from(digest);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function registerUser(input: { id: string; email: string; displayName: string; password: string; role?: UserRole; now?: Date }): BetaUser {
  const email = input.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("INVALID_EMAIL");
  return {
    id: input.id,
    email,
    displayName: input.displayName.trim(),
    role: input.role ?? "CUSTOMER",
    passwordHash: hashPassword(input.password),
    verified: false,
    createdAt: (input.now ?? new Date()).toISOString()
  };
}

export function issueSession(userId: string, now = new Date(), ttlSeconds = 60 * 60 * 24 * 7) {
  const token = randomBytes(32).toString("base64url");
  const session: Session = {
    id: `ses_${randomBytes(8).toString("hex")}`,
    userId,
    tokenHash: hash(token),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString()
  };
  return { token, session };
}

export function validateSession(token: string, session: Session, now = new Date()) {
  return !session.revokedAt && new Date(session.expiresAt) > now && hash(token) === session.tokenHash;
}

export function tokenFrom(request: Request): string {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/token=([^;]+)/);
  if (match) {
    return match[1];
  }
  throw new Error("UNAUTHENTICATED");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}