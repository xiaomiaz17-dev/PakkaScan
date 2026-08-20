import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { renderPassportPdf, type PassportData } from "@/reporting/pdf-passport";
import { updatePdfHash } from "@/commercial/billing/session8-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    let valuation: PassportData["valuation"] = null;
    if (body.valuationComparison?.officialValuePkr || body.valuation?.officialValuePkr) {
      const v = body.valuationComparison || body.valuation;
      const match = v.match;
      const matchLabel = match
        ? [match.city, match.area, match.phase_or_block].filter(Boolean).join(" / ") +
          (v.confidence ? ` (${v.confidence})` : "")
        : v.matchLabel || null;
      valuation = {
        declaredPricePkr: v.declaredPricePkr ?? null,
        officialValuePkr: v.officialValuePkr ?? null,
        ratio: v.ratio ?? null,
        matchLabel,
      };
    }

    const referenceCode = String(body.referenceCode || "PKS-UNKNOWN");
    const data: PassportData = {
      referenceCode,
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
      verifyUrl: String(body.verifyUrl || `https://www.pakkascan.com/verify/${referenceCode}`),
      valuation,
    };

    const pdfBuffer = await renderPassportPdf(data);
    const pdfHash = createHash("sha256").update(pdfBuffer).digest("hex");

    if (referenceCode && referenceCode !== "PKS-UNKNOWN") {
      try {
        await updatePdfHash({ referenceCode, pdfHash });
      } catch (e: any) {
        console.warn("[pdf-passport] could not store pdf_hash:", e?.message || e);
      }
    }

    const filename = `PakkaScan-Passport-${referenceCode}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-PakkaScan-Pdf-Hash": pdfHash,
      "Access-Control-Expose-Headers": "X-PakkaScan-Pdf-Hash, X-PakkaScan-Pdf-Hash-Alg",`r`n      "Access-Control-Expose-Headers": "X-PakkaScan-Pdf-Hash, X-PakkaScan-Pdf-Hash-Alg",
        "X-PakkaScan-Pdf-Hash-Alg": "sha256",
      },
    });
  } catch (err: any) {
    console.error("[pdf-passport] render failed:", err?.message || err);
    return NextResponse.json(
      { error: "pdf_render_failed", detail: err?.message || "unknown" },
      { status: 500 }
    );
  }
}


