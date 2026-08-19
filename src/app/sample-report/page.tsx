"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["700", "900"] });

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE REPORT PAGE
// Fictional Bayana scenario built to demonstrate what PakkaScan surfaces.
// All parties, CNICs, and figures are invented for demonstration.
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "rental" | "bayana" | "full_dd";

const RISK_FACTORS = [
  { label: "Declared price is 62% below FBR valuation \u2014 severe under-declaration risk (Section 111 exposure)", points: -3, category: "financial" },
  { label: "Bayana forfeiture clause: seller pays 0 penalty, buyer forfeits full token", points: -2, category: "legal" },
  { label: "Power of Attorney used \u2014 not attested by Sub-Registrar", points: -2, category: "legal" },
  { label: "Seller CNIC issued in Lahore Cantt, property in Karachi \u2014 verify seller connection", points: -1, category: "identity" },
  { label: "Missing: witness CNICs for both parties", points: -1, category: "document" },
];

const NEXT_STEPS = [
  {
    title: "Do NOT release the Bayana token until issues below are resolved",
    detail: "The forfeiture clause is heavily one-sided and the price declaration exposes you to Section 111 tax scrutiny. Both must be corrected before signing.",
    urdu: "\u062C\u0628 \u062A\u06A9 \u0646\u06CC\u0686\u06D2 \u062F\u06CC\u06D2 \u06AF\u0626\u06D2 \u0645\u0633\u0627\u0626\u0644 \u062D\u0644 \u0646\u06C1 \u06C1\u0648\u06BA\u060C \u0628\u06CC\u0627\u0646\u06C1 \u06A9\u06CC \u0631\u0642\u0645 \u0646\u06C1 \u062F\u06CC\u06BA\u06D4",
    priority: "DO FIRST",
  },
  {
    title: "Ask seller to justify declared price vs FBR valuation",
    detail: "Declared price is Rs 3 crore, FBR valuation is Rs 8 crore. Get written justification and consult a tax advisor about Section 111 exposure before proceeding.",
    urdu: "\u0641\u0631\u0648\u062E\u062A \u06A9\u0646\u0646\u062F\u06C1 \u0633\u06D2 \u0627\u0639\u0644\u0627\u0646 \u06A9\u0631\u062F\u06C1 \u0642\u06CC\u0645\u062A \u0627\u0648\u0631 FBR \u0648\u06CC\u0644\u06CC\u0648\u06CC\u0634\u0646 \u06A9\u06D2 \u0641\u0631\u0642 \u06A9\u06CC \u062A\u062D\u0631\u06CC\u0631\u06CC \u0648\u062C\u06C1 \u0645\u0627\u0646\u06AF\u06CC\u06BA\u06D4",
    priority: "DO FIRST",
  },
  {
    title: "Verify the Power of Attorney is registered with Sub-Registrar",
    detail: "The POA held by Rashid Hussain is not attested by a Sub-Registrar. Unregistered POAs cannot legally transfer property in Pakistan. Demand original registered POA before proceeding.",
    urdu: "\u0648\u06A9\u0627\u0644\u062A \u0646\u0627\u0645\u06C1 \u06A9\u06CC \u0631\u062C\u0633\u0679\u0631\u06CC\u0634\u0646 \u0633\u0628 \u0631\u062C\u0633\u0679\u0631\u0627\u0631 \u06A9\u06D2 \u062F\u0641\u062A\u0631 \u0645\u06CC\u06BA \u062A\u0635\u062F\u06CC\u0642 \u06A9\u0631\u06CC\u06BA\u06D4",
    priority: "IMPORTANT",
  },
  {
    title: "Rewrite Bayana forfeiture clause to be balanced",
    detail: "Current clause forfeits your Rs 30 lakh token if you back out, but seller pays nothing. Standard practice is: seller pays 2x token if they back out. Insist on symmetric penalty before signing.",
    urdu: "\u0628\u06CC\u0627\u0646\u06C1 \u06A9\u06CC \u0636\u0628\u0637\u06AF\u06CC \u06A9\u06CC \u0634\u0631\u0627\u0626\u0637 \u062F\u0648\u0646\u0648\u06BA \u0641\u0631\u06CC\u0642\u06CC\u0646 \u06A9\u06D2 \u0644\u0626\u06D2 \u0628\u0631\u0627\u0628\u0631 \u06C1\u0648\u0646\u06CC \u0686\u0627\u06C1\u06CC\u06BA\u06D4",
    priority: "IMPORTANT",
  },
];

const MISSING_EVIDENCE = [
  "Witness CNICs for both signatories (required by Contract Act 1872)",
  "Original registered Power of Attorney (only photocopy provided)",
  "Seller\u2019s proof of ownership (Fard or prior Sale Deed)",
];

const FINDINGS = [
  "Declared sale price (Rs 3,00,00,000) is 62% below FBR valuation (Rs 8,00,00,000). This exposes buyer to Section 111 tax scrutiny.",
  "Power of Attorney held by third party (Rashid Hussain) is not attested by Sub-Registrar. Unregistered POAs cannot legally transfer immovable property in Pakistan.",
  "Bayana forfeiture clause is one-sided: buyer forfeits full Rs 30 lakh token, seller pays no penalty for backing out.",
  "Seller\u2019s CNIC (35202-XXXXXXX-8) was issued in Lahore Cantt, but property is in Karachi. Verify seller\u2019s connection to the property before proceeding.",
];

function SampleBanner() {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "#fef3c7", borderBottom: "2px solid #f59e0b", padding: "12px 16px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          <span style={{ fontSize: "20px" }}>&#9888;</span>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 800, color: "#78350f", lineHeight: 1.3 }}>SAMPLE REPORT &mdash; demonstration only</div>
            <div style={{ fontSize: "12px", color: "#92400e", lineHeight: 1.4, marginTop: "2px" }}>Fictional scenario. All parties, CNICs, and figures are invented to show what PakkaScan flags on a high-risk Bayana.</div>
          </div>
        </div>
        <Link href="/scan" style={{ padding: "8px 16px", backgroundColor: "#0b132b", color: "#ffffff", fontWeight: 700, fontSize: "13px", borderRadius: "8px", textDecoration: "none", flexShrink: 0 }}>Try your own scan &rarr;</Link>
      </div>
    </div>
  );
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; price: string }[] = [
    { id: "rental", label: "Rental", price: "Rs 499" },
    { id: "bayana", label: "Bayana", price: "Rs 1,499" },
    { id: "full_dd", label: "Full DD", price: "Rs 2,999" },
  ];
  return (
    <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e2e8f0", padding: "24px 0 0 0", flexWrap: "wrap" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "12px 20px",
            border: "none",
            background: "none",
            borderBottom: active === t.id ? "3px solid #16a34a" : "3px solid transparent",
            marginBottom: "-1px",
            cursor: "pointer",
            fontSize: "15px",
            fontWeight: active === t.id ? 800 : 600,
            color: active === t.id ? "#0f172a" : "#64748b",
          }}
        >
          {t.label} <span style={{ fontSize: "12px", opacity: 0.7, marginLeft: "4px" }}>{t.price}</span>
        </button>
      ))}
    </div>
  );
}

function BayanaSampleContent() {
  return (
    <>
      {/* Report header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginTop: "32px", marginBottom: "24px" }}>
        <div>
          <h1 className={fraunces.className} style={{ fontSize: "26px", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>Bayana Safety Check</h1>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>Agreement to Sell &middot; 500 sq yd plot &middot; DHA Phase 6, Karachi</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Reference</div>
          <div style={{ fontSize: "14px", color: "#0f172a", fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>PKS-SAMPLE-2026-DEMO</div>
          <Link href="/verify/PKS-SAMPLE-2026-DEMO" style={{ fontSize: "12px", color: "#16a34a", textDecoration: "none", fontWeight: 600 }}>Verify at pakkascan.com/verify &rarr;</Link>
        </div>
      </div>

      {/* Verdict hero */}
      <div style={{ backgroundColor: "#fef2f2", border: "2px solid #fecaca", borderRadius: "16px", padding: "28px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flex: 1 }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#ffffff", fontSize: "28px", fontWeight: 900 }}>&#10007;</span>
          </div>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#991b1b", letterSpacing: "0.1em", marginBottom: "4px", opacity: 0.75 }}>VERDICT</div>
            <div className={fraunces.className} style={{ fontSize: "32px", fontWeight: 900, color: "#991b1b", lineHeight: 1, marginBottom: "8px" }}>DO NOT PROCEED</div>
            <div style={{ fontSize: "14px", color: "#7f1d1d", lineHeight: 1.5 }}>Serious issues found. Do not release money or sign.</div>
            <div style={{ fontSize: "13px", color: "#991b1b", marginTop: "6px", direction: "rtl", fontFamily: "system-ui, Noto Nastaliq Urdu, serif" }}>{"\u0633\u0646\u06AF\u06CC\u0646 \u0645\u0633\u0627\u0626\u0644 \u067E\u0627\u0626\u06D2 \u06AF\u0626\u06D2 \u06C1\u06CC\u06BA\u06D4 \u067E\u06CC\u0633\u06D2 \u062F\u06CC\u0646\u0627 \u06CC\u0627 \u062F\u0633\u062A\u062E\u0637 \u06A9\u0631\u0646\u0627 \u0628\u0646\u062F \u06A9\u0631\u06CC\u06BA\u06D4"}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: "140px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#991b1b", letterSpacing: "0.1em", marginBottom: "2px", opacity: 0.75 }}>PAKKASCORE</div>
          <div style={{ fontSize: "42px", fontWeight: 900, color: "#991b1b", lineHeight: 1 }}>32<span style={{ fontSize: "18px", opacity: 0.7 }}>/100</span></div>
        </div>
      </div>

      {/* Risk score card */}
      <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#7f1d1d", letterSpacing: "0.1em", marginBottom: "4px", opacity: 0.75, textTransform: "uppercase" }}>Transaction Risk Score</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "36px", fontWeight: 900, color: "#7f1d1d", lineHeight: 1 }}>8<span style={{ fontSize: "16px", opacity: 0.7 }}>/10</span></span>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#dc2626", backgroundColor: "#dc262618", padding: "2px 10px", borderRadius: "6px", letterSpacing: "0.05em" }}>CRITICAL RISK</span>
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #fecaca", paddingTop: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#7f1d1d", marginBottom: "8px" }}>Contributing Factors:</div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {RISK_FACTORS.map((f, i) => (
              <li key={i} style={{ fontSize: "13px", color: "#7f1d1d", lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "4px" }}>
                <span style={{ flexShrink: 0 }}>&#9888;</span>
                <span>{f.label} <span style={{ fontSize: "11px", opacity: 0.7 }}>({f.points})</span></span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* What to do next */}
      <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "32px 0 16px 0" }}>What To Do Next</h2>
      {NEXT_STEPS.map((step, i) => (
        <div key={i} style={{ backgroundColor: step.priority === "DO FIRST" ? "#fef2f2" : "#eff6ff", padding: "20px", borderRadius: "12px", marginBottom: "12px", border: step.priority === "DO FIRST" ? "1px solid #fecaca" : "1px solid #bfdbfe" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>{step.title}</span>
                <span style={{ fontSize: "10px", fontWeight: 800, color: step.priority === "DO FIRST" ? "#991b1b" : "#1e40af", backgroundColor: step.priority === "DO FIRST" ? "#fecaca" : "#bfdbfe", padding: "2px 8px", borderRadius: "4px", letterSpacing: "0.05em" }}>{step.priority}</span>
              </div>
              <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.6, marginBottom: "8px" }}>{step.detail}</div>
              <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6, direction: "rtl", fontFamily: "system-ui, Noto Nastaliq Urdu, serif" }}>{step.urdu}</div>
            </div>
          </div>
        </div>
      ))}

      {/* Missing evidence */}
      <div style={{ backgroundColor: "#fef9c3", padding: "20px", borderRadius: "12px", border: "1px solid #fde68a", marginTop: "24px", marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#854d0e", marginBottom: "10px" }}>Missing Evidence ({MISSING_EVIDENCE.length})</div>
        <ul style={{ margin: 0, paddingLeft: "20px", color: "#854d0e", fontSize: "13px", lineHeight: 1.7 }}>
          {MISSING_EVIDENCE.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      </div>

      {/* Findings */}
      <div style={{ padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "12px" }}>Findings ({FINDINGS.length})</div>
        <ul style={{ margin: 0, paddingLeft: "20px", color: "#334155", fontSize: "13px", lineHeight: 1.7 }}>
          {FINDINGS.map((f, i) => <li key={i} style={{ marginBottom: "8px" }}>{f}</li>)}
        </ul>
      </div>

      {/* Key facts */}
      <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#065f46", letterSpacing: "0.1em", textTransform: "uppercase" }}>Key Facts</div>
          <div style={{ fontSize: "11px", color: "#047857", fontWeight: 700 }}>AI-verified</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          <FactCell label="Seller" value="Muhammad Tariq (via POA)" />
          <FactCell label="Buyer" value="Bilal Ahmad" />
          <FactCell label="Attorney" value="Rashid Hussain" />
          <FactCell label="Property" value="Plot 44, Street 12, DHA Phase 6, Karachi" />
          <FactCell label="Area" value="500 sq yd" />
          <FactCell label="Total Price" value="Rs 3,00,00,000" />
          <FactCell label="Bayana / Token" value="Rs 30,00,000" />
          <FactCell label="FBR Valuation" value="Rs 8,00,00,000" />
          <FactCell label="Execution Date" value="2026-07-15" />
          <FactCell label="Sale Deed Deadline" value="2026-10-15" />
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ backgroundColor: "#0b132b", color: "#ffffff", padding: "40px 32px", borderRadius: "16px", textAlign: "center", marginTop: "40px", marginBottom: "40px" }}>
        <h3 className={fraunces.className} style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>This report was generated in under a minute.</h3>
        <p style={{ fontSize: "15px", color: "#cbd5e1", margin: "0 0 24px 0", lineHeight: 1.6 }}>What is your paperwork telling you? Do not find out the hard way.</p>
        <Link href="/scan" style={{ display: "inline-block", padding: "14px 32px", backgroundColor: "#16a34a", color: "#ffffff", fontWeight: 800, fontSize: "15px", borderRadius: "10px", textDecoration: "none" }}>Start your scan &rarr;</Link>
      </div>
    </>
  );
}

function FactCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: "#ffffff", padding: "12px 14px", borderRadius: "8px", border: "1px solid #d1fae5" }}>
      <div style={{ fontSize: "10px", color: "#059669", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

function TeaserTab({ tier, headline, description, features, cta, href, price }: {
  tier: string; headline: string; description: string; features: string[]; cta: string; href: string; price: string;
}) {
  return (
    <div style={{ marginTop: "32px", padding: "48px 32px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", textAlign: "center" }}>
      <div style={{ display: "inline-block", padding: "4px 12px", backgroundColor: "#ecfdf5", color: "#065f46", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", borderRadius: "6px", marginBottom: "16px", textTransform: "uppercase" }}>{tier} &middot; {price}</div>
      <h2 className={fraunces.className} style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>{headline}</h2>
      <p style={{ fontSize: "15px", color: "#475569", margin: "0 0 32px 0", lineHeight: 1.6, maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>{description}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", maxWidth: "800px", margin: "0 auto 32px auto", textAlign: "left" }}>
        {features.map((f, i) => (
          <div key={i} style={{ padding: "14px 16px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", color: "#334155", display: "flex", gap: "8px" }}>
            <span style={{ color: "#16a34a", fontWeight: 800, flexShrink: 0 }}>&#10003;</span>
            <span>{f}</span>
          </div>
        ))}
      </div>
      <Link href={href} style={{ display: "inline-block", padding: "14px 32px", backgroundColor: "#0b132b", color: "#ffffff", fontWeight: 800, fontSize: "15px", borderRadius: "10px", textDecoration: "none" }}>{cta}</Link>
    </div>
  );
}

export default function SampleReportPage() {
  const [tab, setTab] = useState<Tab>("bayana");

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#faf8f5" }}>
      <SampleBanner />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ padding: "40px 0 8px 0" }}>
          <Link href="/" style={{ fontSize: "13px", color: "#64748b", textDecoration: "none" }}>&larr; Back to home</Link>
        </div>

        <TabBar active={tab} onChange={setTab} />

        {tab === "bayana" && <BayanaSampleContent />}

        {tab === "rental" && (
          <TeaserTab
            tier="Rental Safety Check"
            price="Rs 499"
            headline="Rental scans catch what tenants and landlords miss."
            description="Rental agreements in Pakistan are usually informal templates. PakkaScan reads the full agreement and highlights the clauses that decide who pays for what \u2014 in English and Urdu."
            features={[
              "Security deposit refund terms extracted",
              "Escalation and renewal clauses flagged",
              "Maintenance responsibility identified",
              "Missing witness CNICs surfaced",
              "One-sided termination penalties caught",
              "Complete key facts summary",
            ]}
            cta="Try a Rental Safety Check &rarr;"
            href="/scan"
          />
        )}

        {tab === "full_dd" && (
          <TeaserTab
            tier="Full Property Due Diligence"
            price="Rs 2,999"
            headline="Everything Bayana catches, plus cross-document verification."
            description="For plot purchases, Full DD reconstructs ownership across all five documents \u2014 Sale Deed, Fard, Mutation, CNIC, NEC \u2014 and cross-checks names, CNICs, and dates for consistency."
            features={[
              "Everything in Bayana Safety Check",
              "Sale Deed integrity verification",
              "Fard (ownership record) analysis",
              "Mutation chain reconstruction",
              "Non-Encumbrance Certificate review",
              "Cross-document CNIC matching",
              "Ownership succession timeline",
              "Full evidence appendix",
            ]}
            cta="Try Full Due Diligence &rarr;"
            href="/scan"
          />
        )}
      </div>
    </main>
  );
}