import { Fraunces } from "next/font/google";
import Link from "next/link";
import NavBar from "@/components/NavBar";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Privacy Policy ? PakkaScan",
  description: "How PakkaScan collects, uses, and protects your data.",
};

const h1Style: React.CSSProperties = { fontSize: "34px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px 0", letterSpacing: "-0.02em" };
const dateStyle: React.CSSProperties = { fontSize: "13px", color: "#64748b", fontStyle: "italic", marginBottom: "32px" };
const h2Style: React.CSSProperties = { fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "36px 0 12px 0" };
const pStyle: React.CSSProperties = { margin: "0 0 16px 0", fontSize: "15px", color: "#334155", lineHeight: 1.7 };
const ulStyle: React.CSSProperties = { margin: "0 0 16px 0", paddingLeft: "24px", fontSize: "15px", color: "#334155", lineHeight: 1.7 };
const liStyle: React.CSSProperties = { marginBottom: "6px" };
const strongStyle: React.CSSProperties = { color: "#0f172a", fontWeight: 700 };

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <NavBar />

      <section style={{ padding: "64px 24px 80px 24px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <h1 style={h1Style}>Privacy Policy</h1>
          <p style={dateStyle}>Last updated: 10 August 2026</p>

          <p style={pStyle}>This Privacy Policy explains how PakkaScan collects, uses, and protects your data.</p>

          <h2 style={h2Style}>1. Information We Collect</h2>
          <p style={pStyle}><strong style={strongStyle}>Account information:</strong></p>
          <ul style={ulStyle}>
            <li style={liStyle}>Your email address (required to sign in)</li>
            <li style={liStyle}>Timestamps of your sign-in activity</li>
          </ul>
          <p style={pStyle}><strong style={strongStyle}>Scan data:</strong></p>
          <ul style={ulStyle}>
            <li style={liStyle}>The document type detected (Bayana, Fard, Sale Deed, etc.)</li>
            <li style={liStyle}>Extracted structured fields (party names, CNICs, dates, amounts, addresses)</li>
            <li style={liStyle}>The AI-generated report (verdict, next steps, missing evidence)</li>
            <li style={liStyle}>Timestamp of each scan</li>
          </ul>
          <p style={pStyle}><strong style={strongStyle}>Technical data:</strong></p>
          <ul style={ulStyle}>
            <li style={liStyle}>IP address (for rate limiting and security monitoring)</li>
            <li style={liStyle}>Browser type and device information</li>
            <li style={liStyle}>Session cookies</li>
          </ul>

          <h2 style={h2Style}>2. What We Do NOT Store</h2>
          <p style={pStyle}><strong style={strongStyle}>Original documents:</strong> We do NOT store your uploaded PDF or image files. They are processed in memory during the scan and immediately discarded.</p>
          <p style={pStyle}><strong style={strongStyle}>Payment card details:</strong> We do NOT store card numbers, CVVs, or bank account details. Payments are handled by our payment provider.</p>
          <p style={pStyle}><strong style={strongStyle}>Sensitive personal data beyond documents:</strong> We do NOT collect health information, biometric data, or other special-category personal data.</p>

          <h2 style={h2Style}>3. How We Use Your Data</h2>
          <p style={pStyle}><strong style={strongStyle}>To provide the Service:</strong> Read and analyse your uploaded documents, generate and display reports, store your scan history, send sign-in emails.</p>
          <p style={pStyle}><strong style={strongStyle}>To improve the Service:</strong> Anonymised, aggregated patterns and error monitoring (with CNICs automatically redacted before transmission).</p>
          <p style={pStyle}><strong style={strongStyle}>For safety and legal compliance:</strong> Rate limiting, fraud detection, complying with lawful requests from Pakistani authorities.</p>

          <h2 style={h2Style}>4. Data Sharing</h2>
          <p style={pStyle}>We do NOT sell your data. We do NOT share your data with advertisers.</p>
          <p style={pStyle}>We share limited data with the following service providers, strictly for operating PakkaScan:</p>
          <ul style={ulStyle}>
            <li style={liStyle}><strong style={strongStyle}>Vercel</strong> (hosting) — routes web traffic</li>
            <li style={liStyle}><strong style={strongStyle}>Neon</strong> (database) — stores account and scan data</li>
            <li style={liStyle}><strong style={strongStyle}>Resend</strong> (email) — sends sign-in emails only</li>
            <li style={liStyle}><strong style={strongStyle}>Google (Gemini API)</strong> &mdash; processes document text for OCR and analysis. Document data sent to Google Gemini via API is processed under enterprise data privacy terms and is NOT used to train public AI models.</li>
            <li style={liStyle}><strong style={strongStyle}>Sentry</strong> (error monitoring) — receives error reports with CNICs redacted</li>
            <li style={liStyle}><strong style={strongStyle}>RapidGateway</strong> or payment provider — processes payments when active</li>
          </ul>
          <p style={pStyle}><strong style={strongStyle}>Business transfer:</strong> In the event of a merger, acquisition, or sale of assets, user data may be transferred to the acquiring entity under the same privacy commitments described in this Policy. Users will be notified via email of any such transfer.</p>

          <h2 style={h2Style}>5. Data Retention</h2>
          <ul style={ulStyle}>
            <li style={liStyle}><strong style={strongStyle}>Account data:</strong> retained as long as your account is active. Delete anytime by contacting us.</li>
            <li style={liStyle}><strong style={strongStyle}>Scan reports:</strong> retained indefinitely so you can access past reports.</li>
            <li style={liStyle}><strong style={strongStyle}>Cached analysis outputs in server memory:</strong> automatically cleared within 24 hours (original document files are never cached or stored to disk).</li>
            <li style={liStyle}><strong style={strongStyle}>Original uploaded documents:</strong> never stored.</li>
            <li style={liStyle}><strong style={strongStyle}>Sign-in email links:</strong> valid for 15 minutes, single-use.</li>
            <li style={liStyle}><strong style={strongStyle}>Session cookies:</strong> valid for 30 days from last activity.</li>
          </ul>

          <h2 style={h2Style}>6. Your Rights</h2>
          <p style={pStyle}>You have the right to:</p>
          <ul style={ulStyle}>
            <li style={liStyle}><strong style={strongStyle}>Access:</strong> see all data we hold about you</li>
            <li style={liStyle}><strong style={strongStyle}>Delete:</strong> request deletion of your account and all associated scan history</li>
            <li style={liStyle}><strong style={strongStyle}>Export:</strong> receive a copy of your scan reports in JSON format</li>
            <li style={liStyle}><strong style={strongStyle}>Correct:</strong> update your email address</li>
            <li style={liStyle}><strong style={strongStyle}>Object:</strong> opt out of any non-essential data processing</li>
          </ul>
          <p style={pStyle}>To exercise any of these rights, email support@pakkascan.com or WhatsApp +92 315 6507067.</p>

          <h2 style={h2Style}>7. Cookies</h2>
          <p style={pStyle}>We use the following cookies:</p>
          <ul style={ulStyle}>
            <li style={liStyle}><strong style={strongStyle}>pakkascan_session</strong> (essential): keeps you signed in</li>
            <li style={liStyle}>No advertising or tracking cookies</li>
            <li style={liStyle}>No third-party analytics cookies without your consent</li>
          </ul>

          <h2 style={h2Style}>8. Data Location</h2>
          <ul style={ulStyle}>
            <li style={liStyle}>Application hosted on Vercel (multiple global regions)</li>
            <li style={liStyle}>Database (Neon) hosted in AWS Europe West 2 (London)</li>
            <li style={liStyle}>AI processing (Google Gemini) may occur in Google&apos;s global infrastructure</li>
          </ul>
          <p style={pStyle}>All transmission is encrypted (TLS 1.2+).</p>
          <p style={pStyle}>By using PakkaScan, you consent to the transfer and processing of your data in regional data centres across Europe and globally as required to deliver the AI analysis. All such transfers occur under standard security controls (encryption in transit and at rest, access controls) equivalent to those of Pakistani data protection best practices.</p>

          <h2 style={h2Style}>9. Security</h2>
          <p style={pStyle}>We protect your data using HTTPS encryption, encrypted database connections, signed session cookies, anti-hallucination validation on AI outputs, rate limiting, and error monitoring with automatic CNIC redaction.</p>

          <h2 style={h2Style}>10. Children</h2>
          <p style={pStyle}>PakkaScan is not intended for users under 18. We do not knowingly collect data from minors.</p>

          <h2 style={h2Style}>11. Changes to This Policy</h2>
          <p style={pStyle}>We may update this Policy periodically. Material changes will be announced via email to registered users.</p>

          <h2 style={h2Style}>12. Contact</h2>
          <p style={pStyle}>Data-related questions: support@pakkascan.com or WhatsApp +92 315 6507067.</p>
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
