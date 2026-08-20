import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

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
      return NextResponse.json(
        { found: false, error: "invalid_format" },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT
        reference_code,
        report_type,
        created_at,
        risk_score,
        risk_label,
        score_breakdown,
        verdict,
        pakka_score,
        chain_of_title
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
    });
  } catch (err) {
    console.error("[verify] lookup failed:", err);
    return NextResponse.json(
      { found: false, error: "server_error" },
      { status: 500 }
    );
  }
}
