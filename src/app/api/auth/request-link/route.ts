/**
 * POST /api/auth/request-link
 * Body: { email: string }
 *
 * Generates a magic link, stores hashed token in DB, emails plaintext
 * token as a URL. Rate-limited per email to prevent abuse.
 *
 * ALWAYS returns 200 OK (even for errors/unknown emails) to prevent
 * email-enumeration attacks. Failures are logged server-side only.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";

const bodySchema = z.object({
  email: z.string().email().max(200).transform((s) => s.trim().toLowerCase()),
  returnTo: z.string().max(500).optional(),
});

const LINK_TTL_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  const email = parsed.data.email;

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const recent = await sql`
    SELECT COUNT(*)::int AS c FROM magic_links
    WHERE LOWER(email) = ${email}
      AND created_at > ${fifteenMinutesAgo}
  ` as Array<{ c: number }>;
  if (recent[0].c >= 3) {
    console.warn("[auth/request-link] Rate limit hit for " + email);
    return NextResponse.json({ ok: true });
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;
  const userAgent = request.headers.get("user-agent") || null;

  await sql`
    INSERT INTO magic_links (email, token_hash, expires_at, ip_address, user_agent)
    VALUES (${email}, ${tokenHash}, ${expiresAt.toISOString()}, ${ipAddress}, ${userAgent})
  `;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const rawReturnTo = parsed.data.returnTo;
    const safeReturnTo = rawReturnTo && rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : null;
    const returnToQuery = safeReturnTo ? "&returnTo=" + encodeURIComponent(safeReturnTo) : "";
    const magicLinkUrl = baseUrl + "/api/auth/verify?token=" + rawToken + returnToQuery;

  const emailResult = await sendMagicLinkEmail({
    to: email,
    magicLinkUrl,
    ipAddress,
  });

  if (!emailResult.ok) {
    console.error("[auth/request-link] Email send failed:", emailResult.error);
  }

  return NextResponse.json({ ok: true });
}
