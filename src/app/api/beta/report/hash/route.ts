import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql } from "@/lib/db";

export const maxDuration = 15;

async function ensure() {
  await sql`
    CREATE TABLE IF NOT EXISTS report_pdf_hashes (
      ref TEXT PRIMARY KEY,
      sha256 TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const ref = String(body.referenceCode || body.ref || "").trim();
    const sha = String(body.sha256 || "").trim().toLowerCase();
    if (!ref || !/^[a-f0-9]{64}$/.test(sha)) {
      return NextResponse.json({ ok: false, error: "BAD_HASH" }, { status: 400 });
    }
    await ensure();
    await sql`
      INSERT INTO report_pdf_hashes (ref, sha256)
      VALUES (${ref}, ${sha})
      ON CONFLICT (ref) DO UPDATE SET sha256 = ${sha}, updated_at = now()
    `;
    return NextResponse.json({ ok: true, ref, sha256: sha });
  } catch (e: any) {
    console.warn("[pdf-hash] store failed", e?.message || e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

export async function GET(request: Request) {
  try {
    const ref = String(new URL(request.url).searchParams.get("ref") || "").trim();
    if (!ref) return NextResponse.json({ ok: false }, { status: 400 });
    await ensure();
    const rows = await sql`SELECT sha256 FROM report_pdf_hashes WHERE ref = ${ref} LIMIT 1`;
    const sha = rows?.[0]?.sha256 || null;
    return NextResponse.json({ ok: true, ref, sha256: sha });
  } catch {
    return NextResponse.json({ ok: true, sha256: null });
  }
}