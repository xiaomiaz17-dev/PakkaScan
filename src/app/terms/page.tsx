import { Fraunces } from "next/font/google";
import Link from "next/link";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Terms of Service ? PakkaScan",
  description: "The terms governing your use of PakkaScan.",
};

const h1Style: React.CSSProperties = { fontSize: "34px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0", letterSpacing: "-0.02em" };
const dateStyle: React.CSSProperties = { fontSize: "13px", color: "#64748b", fontStyle: "italic", marginBottom: "32px" };
const h2Style: React.CSSProperties = { fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "36px 0 12px 0" };
const pStyle: React.CSSProperties = { margin: "0 0 16px 0", fontSize: "15px", color: "#334155", lineHeight: 1.7 };
const ulStyle: React.CSSProperties = { margin: "0 0 16px 0", paddingLeft: "24px", fontSize: "15px", color: "#334155", lineHeight: 1.7 };
const liStyle: React.CSSProperties = { marginBottom: "6px" };
const strongStyle: React.CSSProperties = { color: "#0f172a", fontWeight: 700 };

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "rgba(11, 19, 43, 0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#0b132b", border: "2px solid #ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" style={{ color: "#ffffff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className={fraunces.className} style={{ fontSize: "20px", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em" }}>
              Pakka<span style={{ color: "#16a34a", fontStyle: "italic" }}>Scan</span>
            </div>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <Link href="/pricing" style={{ color: "#cbd5e1", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>Pricing</Link>
            <Link href="/about" style={{ color: "#cbd5e1", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>About</Link>
            <Link href="/faq" style={{ color: "#cbd5e1", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>FAQ</Link>
            <Link href="/contact" style={{ color: "#cbd5e1", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>Contact</Link>
          </nav>
        </div>
      </div>

      <section style={{ padding: "64px 24px 80px 24px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <h1 style={h1Style}>Terms of Service</h1>
          <p style={dateStyle}>Last updated: 10 August 2026</p>

          <p style={pStyle}>These Terms of Service (&quot;Terms&quot;) govern your access to and use of PakkaScan (the &quot;Service&quot;), operated by PakkaScan (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>

          <h2 style={h2Style}>1. What PakkaScan Is</h2>
          <p style={pStyle}>PakkaScan is an AI-powered document analysis tool for Pakistani property documents. It reads text from uploaded documents, extracts structured information, and produces an advisory report indicating whether the document appears complete, what evidence may be missing, and what next steps the user should consider.</p>

          <h2 style={h2Style}>2. What PakkaScan Is Not</h2>
          <p style={pStyle}>PakkaScan is NOT:</p>
          <ul style={ulStyle}>
            <li style={liStyle}>A licensed lawyer, law firm, or provider of legal advice</li>
            <li style={liStyle}>A certified real estate agent or property broker</li>
            <li style={liStyle}>A government-authorised verification service</li>
            <li style={liStyle}>A guarantee that documents are authentic or unforged</li>
            <li style={liStyle}>A substitute for independent legal counsel or professional due diligence</li>
          </ul>
          <p style={pStyle}>PakkaScan does not verify documents against government databases (NADRA, PLRA, Sub-Registrar records, Patwari records) unless explicitly stated for a specific integration. Reports are AI-generated advisory information only.</p>

          <h2 style={h2Style}>3. Your Responsibilities</h2>
          <p style={pStyle}>By using the Service, you agree that you:</p>
          <ul style={ulStyle}>
            <li style={liStyle}>Are legally authorised to upload each document you submit</li>
            <li style={liStyle}>Will not upload documents belonging to third parties without their consent</li>
            <li style={liStyle}>Will not use PakkaScan to attempt to verify documents you know or suspect to be forged</li>
            <li style={liStyle}>Are solely responsible for verifying the authenticity of any document with the relevant authority before making any financial commitment</li>
            <li style={liStyle}>Will not rely solely on a PakkaScan report to complete any high-value transaction</li>
            <li style={liStyle}><strong style={strongStyle}>Understand that PakkaScan reports are strictly advisory.</strong> Transferring money &mdash; including bayana, token payment, or full payment &mdash; solely on the basis of a PakkaScan report, without independent legal counsel and verification with the relevant authority, is done entirely at your own risk.</li>
            <li style={liStyle}><strong style={strongStyle}>Agree to indemnify and hold PakkaScan harmless</strong> from any third-party claims arising from your uploads (including unauthorized document uploads), your reliance on PakkaScan reports, or your use of the Service to make financial decisions.</li>
          </ul>

          <h2 style={h2Style}>4. Accuracy and Limitations</h2>
          <p style={pStyle}>PakkaScan uses artificial intelligence, which can make mistakes. While we implement multiple safeguards (regex extraction, anti-hallucination validation, cross-document reasoning), no automated system is perfect.</p>
          <p style={pStyle}>You accept that reports are provided on a &quot;best-effort&quot; basis and may contain errors or omissions.</p>

          <h2 style={h2Style}>5. Financial Liability</h2>
          <p style={pStyle}><strong style={strongStyle}>PakkaScan is not liable for any financial loss arising from your use of a report.</strong> Your maximum recourse for any complaint is a refund of the specific scan fee paid.</p>

          <h2 style={h2Style}>6. Refunds</h2>
          <p style={pStyle}>Refunds are handled case-by-case. We will consider refunds if PakkaScan produced clearly incorrect information (e.g., fabricated a CNIC number), or a technical failure prevented the report from generating. Refund requests should be sent via WhatsApp or email within 7 days of the scan.</p>

          <h2 style={h2Style}>7. Payment</h2>
          <p style={pStyle}>Payment is required per report (see Pricing page for current tiers). Your first scan is provided free of charge to allow you to evaluate report quality before paying.</p>

          <h2 style={h2Style}>8. Account and Session</h2>
          <p style={pStyle}>Access to PakkaScan requires signing in with a valid email address. You are responsible for maintaining the confidentiality of your account.</p>

          <h2 style={h2Style}>9. Acceptable Use</h2>
          <p style={pStyle}>You may not attempt to reverse-engineer the Service, use automated scripts that exceed rate limits, upload malicious files, or use PakkaScan to facilitate fraudulent transactions. Violations may result in account suspension without refund.</p>

          <h2 style={h2Style}>10. Data and Privacy</h2>
          <p style={pStyle}>Your use of PakkaScan is governed by our <Link href="/privacy" style={{ color: "#16a34a", textDecoration: "underline" }}>Privacy Policy</Link>. Uploaded documents are processed in memory only and not stored to disk.</p>

          <h2 style={h2Style}>11. Intellectual Property</h2>
          <p style={pStyle}>The PakkaScan name, logo, software, AI models, prompts, and report templates are our intellectual property. You may use reports we generate for your personal decision-making but may not redistribute them commercially without written permission.</p>

          <h2 style={h2Style}>12. Changes to Service</h2>
          <p style={pStyle}>We may modify or discontinue PakkaScan at any time. We will provide reasonable notice for material changes affecting paid users.</p>

          <h2 style={h2Style}>13. Governing Law</h2>
          <p style={pStyle}>These Terms are governed by the laws of the Islamic Republic of Pakistan. Any disputes will be resolved in the courts of Karachi, Pakistan.</p>

          <h2 style={h2Style}>14. Contact</h2>
          <p style={pStyle}>Questions about these Terms: support@pakkascan.com or WhatsApp +92 315 6507067.</p>

          <h2 style={h2Style}>15. Dispute Resolution</h2>
          <p style={pStyle}>Before initiating any legal proceedings, both parties agree to attempt good-faith negotiation for at least 30 calendar days from the date a dispute is first raised in writing. If the dispute remains unresolved after this period, it will proceed to the civil courts of Karachi as described in Section 13.</p>
          <p style={pStyle}>This pre-litigation negotiation requirement is intended to reduce costs and time for both parties. Nothing in this clause prevents either party from seeking urgent injunctive relief in a court of competent jurisdiction if immediate action is necessary.</p>
        </div>
      </section>

      <footer style={{ backgroundColor: "#0b132b", color: "#94a3b8", padding: "48px 24px 32px 24px", marginTop: "40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", fontSize: "12px", color: "#64748b", textAlign: "center" }}>
          <p style={{ margin: 0 }}>&copy; 2026 PakkaScan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
