import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getPdfHash } from "@/commercial/billing/session8-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REF_PATTERN = /^PKS-\d{4}-\d{2}-[A-Z0-9]{4,}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference: rawRef } = await params;
    const reference = (rawRef || "").trim().toUpperCase();

    if (!reference || !REF_PATTERN.test(reference)) {
      return NextResponse.json({ found: false, error: "invalid_format" }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        reference_code, report_type, created_at,
        risk_score, risk_label, score_breakdown, verdict, pakka_score,
        chain_of_title, pdf_hash, pdf_generated_at, public_summary
      FROM scan_usage
      WHERE reference_code = ${reference}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    const row = rows[0] as any;
    return NextResponse.json({
      found: true,
      referenceCode: row.reference_code,
      reportType: row.report_type,
      scannedAt: row.created_at,
      riskScore: row.risk_score ?? null,
      riskLabel: row.risk_label ?? null,
      scoreBreakdown: row.score_breakdown ?? null,
      verdict: row.verdict ?? null,
      pakkaScore: row.pakka_score ?? null,
      chainOfTitle: row.chain_of_title ?? null,
      hasPdfHash: Boolean(row.pdf_hash),
      pdfGeneratedAt: row.pdf_generated_at ?? null,
      publicSummary: row.public_summary ?? null,
      riskFactors: Array.isArray(row.public_summary?.riskFactors) ? row.public_summary.riskFactors : [],
      valuationSummary: row.public_summary?.valuation ?? null,
      missingProtections: Array.isArray(row.public_summary?.missingProtections) ? row.public_summary.missingProtections : [],
    });
  } catch (err) {
    console.error("[verify] lookup failed:", err);
    return NextResponse.json({ found: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference: rawRef } = await params;
    const reference = (rawRef || "").trim().toUpperCase();
    if (!reference || !REF_PATTERN.test(reference)) {
      return NextResponse.json({ error: "invalid_format" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const candidate = String(body?.pdfHash || body?.hash || "")
      .trim()
      .toLowerCase()
      .replace(/^sha256:/, "");

    if (!candidate || !/^[a-f0-9]{64}$/.test(candidate)) {
      return NextResponse.json(
        { error: "invalid_hash", message: "Provide a 64-char SHA-256 hex hash" },
        { status: 400 }
      );
    }

    const stored = await getPdfHash(reference);
    if (!stored) {
      return NextResponse.json({
        match: false,
        reason: "no_pdf_on_record",
        message: "No PDF has been generated for this reference yet.",
      });
    }

    const match = stored.toLowerCase() === candidate;
    return NextResponse.json({
      match,
      reason: match ? "hash_match" : "hash_mismatch",
      message: match
        ? "PDF hash matches the original issued by PakkaScan â€” document has not been tampered with."
        : "PDF hash does not match the original. This file may have been altered or is not the official passport.",
    });
  } catch (err) {
    console.error("[verify] hash check failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

