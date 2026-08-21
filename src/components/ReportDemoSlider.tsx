"use client";
import { useState } from "react";
import Link from "next/link";

export default function ReportDemoSlider() {
  const [v, setV] = useState(55);
  return (
    <section style={{ padding: "56px 24px", backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
          From upload to bilingual passport
        </h2>
        <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>
          Drag the slider: left = paperwork pressure · right = structured verdict you can act on.
        </p>
      </div>
      <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", minHeight: 220, background: "#0b132b" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex" }}>
          <div style={{ width: `${v}%`, background: "linear-gradient(135deg,#1e293b,#0f172a)", padding: 24, color: "#94a3b8", overflow: "hidden", boxSizing: "border-box" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 8 }}>BEFORE</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: "#cbd5e1" }}>
              Bayana PDF · unclear clauses · “sign today” pressure · no independent second read.
            </div>
          </div>
          <div style={{ flex: 1, background: "#f8fafc", padding: 24, color: "#0f172a", boxSizing: "border-box" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>AFTER · SAMPLE</div>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>Risk 8/10 · Do Not Proceed</div>
            <div style={{ fontSize: 13, color: "#b91c1c", marginBottom: 8 }}>Flagged for WhatsApp: under-declared price · weak PoA</div>
            <div style={{ fontSize: 12, color: "#64748b", fontFamily: "ui-monospace, monospace" }}>PKS-SAMPLE-2026-DEMO</div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 720, margin: "16px auto 0", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Doc</span>
        <input type="range" min={20} max={80} value={v} onChange={(e) => setV(Number(e.target.value))} style={{ flex: 1 }} aria-label="Reveal passport" />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Passport</span>
      </div>
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Link href="/sample-report" style={{ fontWeight: 800, color: "#0f766e", textDecoration: "none" }}>Open full sample report →</Link>
      </div>
    </section>
  );
}
