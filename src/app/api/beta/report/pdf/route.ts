import { NextRequest, NextResponse } from "next/server";
import { renderPassportPdf, type PassportData } from "@/reporting/pdf-passport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const data: PassportData = {
      referenceCode: String(body.referenceCode || "PKS-UNKNOWN"),
      scannedAt: String(body.scannedAt || new Date().toISOString()),
      reportType: String(body.reportType || "SCAN"),
      riskScore: Number(body.riskScore) || 1,
      riskLabel: (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(body.riskLabel)
        ? body.riskLabel
        : "MEDIUM") as PassportData["riskLabel"],
      riskFactors: Array.isArray(body.riskFactors) ? body.riskFactors : [],
      scoreBreakdown: body.scoreBreakdown ? String(body.scoreBreakdown) : undefined,
      verdict: String(body.verdict || "REVIEW"),
      pakkaScore: body.pakkaScore != null ? Number(body.pakkaScore) : null,
      keyFacts: Array.isArray(body.keyFacts) ? body.keyFacts : undefined,
      verifyUrl: String(body.verifyUrl || `https://www.pakkascan.com/verify/${body.referenceCode || ""}`),
    };
    const pdfBuffer = await renderPassportPdf(data);
    const filename = `PakkaScan-Passport-${data.referenceCode}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[pdf-passport] render failed:", err?.message || err);
    return NextResponse.json({ error: "pdf_render_failed", detail: err?.message || "unknown" }, { status: 500 });
  }
}
