import { Fraunces } from "next/font/google";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import { QRCodeSVG } from "qrcode.react";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

const WHATSAPP_URL = "https://wa.me/923156507067?text=" + encodeURIComponent("Hi PakkaScan, I have a question.");

const navLinkStyle: React.CSSProperties = { color: "#cbd5e1", fontSize: "14px", fontWeight: 600, textDecoration: "none" };
const footerLinkStyle: React.CSSProperties = { display: "block", fontSize: "13px", color: "#94a3b8", textDecoration: "none", padding: "6px 0", lineHeight: 1.4 };

export const metadata = {
  title: "Sample Report - See PakkaScan In Action",
  description: "An anonymised example of a PakkaScan due diligence report.",
};

export default function SampleReportPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{"@media (max-width: 640px) { .pks-facts-grid { grid-template-columns: 1fr !important; } }"}</style>
      <NavBar />

      {/* Banner */}
      <div style={{ backgroundColor: "#eff6ff", borderBottom: "1px solid #bfdbfe", padding: "12px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", fontSize: "13px", color: "#1e40af" }}>
          <strong>Sample report.</strong> Details anonymised for privacy. Real reports use your actual document data.
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "40px auto", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "6px" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>Due Diligence Report</h1>
            <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px" }}>Bayana / Agreement to Sell</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
            <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace", backgroundColor: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              Ref: <span style={{ fontWeight: 700, color: "#0f172a" }}>PKS-2026-08-A7F2</span>
            </div>
            <a
              href="/verify/PKS-2026-08-A7F2"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "10px", color: "#059669", textDecoration: "none", fontWeight: 500 }}
            >
              Verify at pakkascan.com/verify &rarr;
            </a>
          </div>
        </div>

        {/* Verdict Hero (green PROCEED) */}
        <div style={{ background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)", border: "2px solid #86efac", borderRadius: "16px", padding: "24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#16a34a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: 900, flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>OK</div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#14532d", letterSpacing: "0.1em", marginBottom: "4px", opacity: 0.75 }}>VERDICT</div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#14532d", marginBottom: "6px", letterSpacing: "-0.02em" }}>PROCEED</div>
            <div style={{ fontSize: "14px", color: "#14532d", opacity: 0.9, lineHeight: 1.4 }}>This document looks safe to move forward with.</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "#14532d", letterSpacing: "0.1em", marginBottom: "2px", opacity: 0.75 }}>PAKKASCORE</div>
            <div style={{ fontSize: "36px", fontWeight: 900, color: "#14532d", lineHeight: 1 }}>100<span style={{ fontSize: "16px", opacity: 0.7 }}>/100</span></div>
          </div>
        </div>

        {/* What To Do Next */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0" }}>What To Do Next</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { title: "Verify seller CNIC in person", detail: "Ask [Seller Name] to show his original CNIC in person and match the number against the one on the Bayana before handing over any further funds." },
              { title: "Get a current dated Fard", detail: "Request a Fard-e-Malkiat from the local revenue office to confirm [Seller Name] is the recorded owner of the property." },
              { title: "Non-encumbrance registry search", detail: "Conduct a non-encumbrance check at the Sub-Registrar office to ensure the plot has no active mortgages or legal claims." },
              { title: "Keep signed copies safe", detail: "Store your signed copy of the Bayana + Pay Order receipt in a secure location until the final Sale Deed is registered." },
            ].map((step, i) => (
              <div key={i} style={{ backgroundColor: i < 2 ? "#fef2f2" : (i < 3 ? "#eff6ff" : "#f0fdf4"), border: "1px solid " + (i < 2 ? "#fecaca" : (i < 3 ? "#bfdbfe" : "#bbf7d0")), borderRadius: "12px", padding: "14px 16px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#0b132b", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{step.title}</span>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: i < 2 ? "#991b1b" : (i < 3 ? "#1e40af" : "#166534"), backgroundColor: i < 2 ? "#fee2e2" : (i < 3 ? "#dbeafe" : "#dcfce7"), padding: "2px 6px", borderRadius: "4px", letterSpacing: "0.05em" }}>{i < 2 ? "DO FIRST" : (i < 3 ? "IMPORTANT" : "OPTIONAL")}</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Missing Evidence */}
        <div style={{ backgroundColor: "#fef9c3", padding: "16px", borderRadius: "12px", border: "1px solid #fde68a", marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#854d0e", marginBottom: "10px" }}>Missing Evidence (3)</div>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#854d0e", fontSize: "13px", lineHeight: 1.6 }}>
            <li>CNIC (or NICOP/POC) of the seller and buyer</li>
            <li>Current dated Fard or equivalent ownership record</li>
            <li>Current non-encumbrance / registry search (recommended)</li>
          </ul>
        </div>

        {/* Doc Details */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px", marginTop: "8px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Document Details</div>
          <div style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>sample-bayana-anonymised.pdf</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Identified as: <strong style={{ color: "#0f172a" }}>Bayana / Agreement to Sell</strong></div>

            <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", marginTop: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em" }}>Key Facts</span>
                <span style={{ fontSize: "9px", color: "#16a34a", fontWeight: 700 }}>AI-verified</span>
              </div>
              <div className="pks-facts-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: "SELLER", value: "[Seller Name]" },
                  { label: "BUYER", value: "[Buyer Name]" },
                  { label: "TOTAL PRICE", value: "PKR 45,000,000" },
                  { label: "TOKEN / BAYANA", value: "PKR 5,000,000" },
                  { label: "BALANCE DUE", value: "PKR 40,000,000" },
                  { label: "PROPERTY ADDRESS", value: "Property No. [X-XX], DHA Phase [X], Lahore" },
                  { label: "PROPERTY TYPE", value: "Plot / House" },
                  { label: "AREA", value: "1 Kanal" },
                  { label: "SIGNED ON", value: "2026-08-07" },
                  { label: "BALANCE DUE BY", value: "2026-09-30" },
                ].map((r, i) => (
                  <div key={i} style={{ backgroundColor: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #dcfce7" }}>
                    <div style={{ fontSize: "10px", color: "#166534", fontWeight: 700, marginBottom: "3px", letterSpacing: "0.03em" }}>{r.label}</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>{r.value}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "12px", color: "#166534", margin: "12px 0 0 0", fontStyle: "italic", lineHeight: 1.5 }}>
                [Seller] agreed to sell Property No. [X-XX] in DHA Phase [X], Lahore, measuring 1 Kanal to [Buyer] for PKR 45,000,000, with a token of PKR 5,000,000 paid and the balance due by 30 September 2026.
              </p>
            </div>
          </div>
        </div>

        {/* Verify footer with QR */}
        <div style={{ marginTop: "36px", paddingTop: "24px", borderTop: "1px solid #e2e8f0" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            padding: "20px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}>
            <div style={{
              backgroundColor: "#ffffff",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              lineHeight: 0,
            }}>
              <QRCodeSVG
                value="https://www.pakkascan.com/verify/PKS-2026-08-A7F2"
                size={130}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                Verify this report
              </div>
              <div style={{ fontSize: "12px", color: "#475569", marginBottom: "10px", lineHeight: 1.5 }}>
                Scan the QR code or visit the URL below to confirm this report
                was issued by PakkaScan.
              </div>
              <div style={{
                fontSize: "11px",
                fontFamily: "monospace",
                color: "#0f172a",
                backgroundColor: "#ffffff",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                wordBreak: "break-all",
              }}>
                pakkascan.com/verify/PKS-2026-08-A7F2
              </div>
              <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "8px", fontStyle: "italic" }}>
                Public verification does not reveal document contents.
              </div>
            </div>
          </div>
        </div>
        {/* CTA */}
        <div style={{ marginTop: "48px", textAlign: "center", backgroundColor: "#0b132b", color: "#ffffff", padding: "40px 24px", borderRadius: "16px" }}>
          <div className={fraunces.className} style={{ fontSize: "26px", fontWeight: 900, marginBottom: "12px", letterSpacing: "-0.02em" }}>
            Ready to scan your own?
          </div>
          <p style={{ fontSize: "14px", color: "#cbd5e1", marginBottom: "24px", lineHeight: 1.6 }}>
            Get a real bilingual report on your actual Bayana, Fard, or Sale Deed in 2 minutes.
          </p>
          <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 32px", backgroundColor: "#16a34a", color: "#ffffff", fontWeight: 700, fontSize: "15px", borderRadius: "12px", textDecoration: "none", boxShadow: "0 4px 16px rgba(22,163,74,0.4)" }}>
            Scan Your First Document
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: "#0b132b", color: "#94a3b8", padding: "48px 24px 32px 24px", marginTop: "80px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px", marginBottom: "32px" }}>
            <div>
              <div className={fraunces.className} style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff", marginBottom: "8px" }}>
                Pakka<span style={{ color: "#16a34a", fontStyle: "italic" }}>Scan</span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>AI-powered document verification for Pakistani property transactions.</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Product</div>
              <Link href="/scan" style={footerLinkStyle}>Scan a Document</Link>
              <Link href="/pricing" style={footerLinkStyle}>Pricing</Link>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Company</div>
              <Link href="/about" style={footerLinkStyle}>About</Link>
              <Link href="/contact" style={footerLinkStyle}>Contact</Link>
              <Link href="/faq" style={footerLinkStyle}>FAQ</Link>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Legal</div>
              <Link href="/terms" style={footerLinkStyle}>Terms of Service</Link>
              <Link href="/privacy" style={footerLinkStyle}>Privacy Policy</Link>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Support</div>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ ...footerLinkStyle, color: "#25D366" }}>WhatsApp Support</a>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "24px", fontSize: "11px", color: "#64748b", lineHeight: 1.7 }}>
            <p style={{ margin: "0 0 12px 0" }}>
              <strong style={{ color: "#94a3b8" }}>Disclaimer:</strong> Sample report shown above uses fictitious details for illustration purposes only. PakkaScan is an AI-powered assistive tool. Not a licensed lawyer. Reports are advisory. Always confirm high-value transactions with qualified legal counsel.
            </p>
            <p style={{ margin: 0 }}>&copy; 2026 PakkaScan. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
