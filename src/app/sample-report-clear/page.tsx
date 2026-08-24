"use client";
import Link from "next/link";

/**
 * Always-on clean sample for demos — contrast with /sample-report (high risk).
 */
export default function SampleReportClearPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 48px", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
        <Link href="/sample-report" style={{ color: "#0d9488" }}>High-risk sample</Link>
        {" · "}
        <Link href="/scan" style={{ color: "#0d9488" }}>Run your own scan</Link>
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>Sample report — clean (illustrative)</h1>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
        Sample · Ref: <code>PKS-SAMPLE-2026-CLEAR</code>
      </p>

      <div
        style={{
          background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#065f46", opacity: 0.8 }}>VERDICT</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#065f46" }}>PROCEED</div>
        <div style={{ fontSize: 14, color: "#065f46", marginTop: 4 }}>No hard blockers in this illustrative packet.</div>
      </div>

      <div
        style={{
          background: "#ecfdf5",
          border: "1px solid #a7f3d0",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: "#065f46", letterSpacing: "0.08em" }}>RISK LEVEL</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#16a34a", background: "#16a34a18", padding: "4px 10px", borderRadius: 8 }}>
            LOW RISK
          </span>
          <span style={{ fontSize: 14, color: "#065f46" }}>Severity 2/10 (higher = more concern)</span>
        </div>
        <p style={{ fontSize: 13, color: "#065f46", margin: "10px 0 0", lineHeight: 1.5 }}>
          What this means: No major red flags stood out. Confidence is about how clearly we read the document; risk level is about deal concerns. Still verify identity before paying.
        </p>
      </div>

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em", marginBottom: 8 }}>
          TAX &amp; VALUATION (ILLUSTRATIVE)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
          <div>
            <div style={{ color: "#64748b", fontSize: 11 }}>Declared sale value</div>
            <div style={{ fontWeight: 800 }}>PKR 12,500,000</div>
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: 11 }}>DC / FBR reference</div>
            <div style={{ fontWeight: 800 }}>PKR 12,200,000</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#065f46", margin: "10px 0 0", fontWeight: 600 }}>
          Declared value within normal range of benchmark — no material under-declaration signal in this sample.
        </p>
      </div>

      <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
        Illustrative data only. Not a real property. For the high-risk contrast, see the{" "}
        <Link href="/sample-report">main sample report</Link>.
      </p>
    </main>
  );
}
