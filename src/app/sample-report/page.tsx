"use client";

import Link from "next/link";
import { RiskMeaningStrip } from "@/components/RiskMeaningStrip";

/**
 * Always-on sample so cold leads don't need a credit.
 * Mirrors a realistic Full DD outcome (illustrative numbers).
 */
export default function SampleReportPage() {
  const riskScore = 8;
  const riskLabel = "HIGH";
  const factors = [
    {
      label:
        "Declared price may be well below official DC/FBR benchmark — Section 111 exposure risk",
      points: -3,
    },
    { label: "Sale Deed present but no Mutation (Inteqal) in this bundle", points: -2 },
    { label: "Missing standard protections: possession timeline; forfeiture balance", points: -1 },
  ];

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div
        style={{
          marginBottom: 16,
          padding: "10px 14px",
          borderRadius: 8,
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          fontSize: 13,
          color: "#1e40af",
          fontWeight: 600,
        }}
      >
        Sample report — illustrative data only.{" "}
        <Link href="/scan" style={{ color: "#1d4ed8", textDecoration: "underline" }}>
          Run your own scan →
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>Full Property Due Diligence</h1>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
        Sample · Ref: <code>PKS-SAMPLE-2026-DEMO</code>
      </p>

      <div
        style={{
          padding: 16,
          borderRadius: 12,
          background: "linear-gradient(135deg,#ffedd5,#fed7aa)",
          border: "1px solid #fdba74",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#9a3412" }}>
          VERDICT
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#7c2d12" }}>PROCEED WITH CAUTION</div>
        <div style={{ fontSize: 13, color: "#9a3412", marginTop: 6 }}>
          Material gaps and possible under-declaration. Resolve before paying the balance.
        </div>
        <div dir="rtl" style={{ fontSize: 14, color: "#9a3412", marginTop: 8, lineHeight: 1.8 }}>
          اہم خلا اور ممکنہ کم اعلان شدہ قیمت۔ بقیہ رقم ادا کرنے سے پہلے تصفیہ کریں۔
        </div>
      </div>

      <div
        style={{
          padding: 16,
          borderRadius: 12,
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: "#9a3412", letterSpacing: "0.08em" }}>
          TRANSACTION RISK SCORE
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#9a3412" }}>
          {riskScore}
          <span style={{ fontSize: 14 }}>/10</span>{" "}
          <span style={{ fontSize: 14, fontWeight: 800 }}>{riskLabel} RISK</span>
        </div>
        <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, color: "#7c2d12", lineHeight: 1.55 }}>
          {factors.map((f, i) => (
            <li key={i}>
              {f.label} ({f.points})
            </li>
          ))}
        </ul>
      </div>

      <RiskMeaningStrip riskScore={riskScore} riskLabel={riskLabel} riskFactors={factors} />

      <div
        style={{
          padding: 14,
          borderRadius: 12,
          border: "1px solid #fecaca",
          background: "#fef2f2",
          marginBottom: 16,
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 800, color: "#991b1b", marginBottom: 6 }}>
          Official Valuation Check (sample)
        </div>
        Declared PKR 6,500,000 · Official ~ PKR 36,900,000 · Ratio ~18% — severe Section 111 exposure
        (illustrative DHA Phase 5 style match).
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link
          href="/scan"
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            background: "#0d9488",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Scan your documents
        </Link>
        <Link
          href="/verify/PKS-SAMPLE-2026-DEMO"
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            color: "#0f172a",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            background: "#fff",
          }}
        >
          Open sample verify page
        </Link>
      </div>
    </main>
  );
}
