import { Fraunces } from "next/font/google";
import Link from "next/link";
import NavBar from "@/components/NavBar";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

const WHATSAPP_URL = "https://wa.me/923156507067?text=" + encodeURIComponent("Hi PakkaScan, I have a question.");

const navLinkStyle: React.CSSProperties = { color: "#cbd5e1", fontSize: "14px", fontWeight: 600, textDecoration: "none" };
const footerLinkStyle: React.CSSProperties = { display: "block", fontSize: "13px", color: "#94a3b8", textDecoration: "none", padding: "6px 0", lineHeight: 1.4 };

export const metadata = {
  title: "About PakkaScan ? Verify Before You Trust",
  description: "Why PakkaScan exists and how it protects Pakistani property buyers.",
};

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Simple nav bar */}
      <NavBar currentPage="About" />

      {/* Hero */}
      <section style={{ backgroundColor: "#0b132b", color: "#ffffff", padding: "64px 24px 48px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "16px" }}>Our Story</div>
          <h1 className={fraunces.className} style={{ fontSize: "44px", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 20px 0", lineHeight: 1.2 }}>
            Why <span style={{ color: "#16a34a", fontStyle: "italic" }}>PakkaScan</span> Exists
          </h1>
          <p style={{ fontSize: "17px", color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
            An honest second opinion for Pakistani property documents. Built by people who&apos;ve been there.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section style={{ padding: "64px 24px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ fontSize: "17px", color: "#334155", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 24px 0" }}>
              PakkaScan was built after our founder&apos;s family came close to a serious property fraud in Pakistan. The documents looked official. Everyone assumed they were fine. It took a lawyer three days and Rs 30,000 to confirm they weren&apos;t.
            </p>
            <p style={{ margin: "0 0 24px 0" }}>
              We built PakkaScan so no one else has to spend three days and Rs 30,000 to answer a simple question: <strong style={{ color: "#0f172a" }}>are these papers real?</strong>
            </p>
            <p style={{ margin: "0 0 32px 0" }}>
              Upload your Bayana, Fard, Sale Deed, or CNIC. In under two minutes, PakkaScan reads every clause (in English and Urdu), cross-checks the details, and tells you honestly:
            </p>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
                <div style={{ backgroundColor: "#dcfce7", color: "#166534", fontWeight: 900, fontSize: "12px", padding: "4px 10px", borderRadius: "6px", flexShrink: 0, marginTop: "2px" }}>OK</div>
                <div><strong style={{ color: "#0f172a" }}>Proceed</strong> ? this looks safe</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "16px" }}>
                <div style={{ backgroundColor: "#fef3c7", color: "#92400e", fontWeight: 900, fontSize: "12px", padding: "4px 10px", borderRadius: "6px", flexShrink: 0, marginTop: "2px" }}>?</div>
                <div><strong style={{ color: "#0f172a" }}>Proceed with caution</strong> ? here&apos;s what&apos;s missing</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", fontWeight: 900, fontSize: "12px", padding: "4px 10px", borderRadius: "6px", flexShrink: 0, marginTop: "2px" }}>!</div>
                <div><strong style={{ color: "#0f172a" }}>Do not proceed</strong> ? here&apos;s what&apos;s wrong</div>
              </div>
            </div>

            <p style={{ margin: "0 0 32px 0" }}>
              No jargon. No wait. No middleman. Just an honest second opinion before you hand over any money.</p>

            {/* Core Principles Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", margin: "32px 0" }}>
              {[
                { badge: "EN—UR", title: "Bilingual Integrity", desc: "Full English and Urdu (Nastaliq) extraction on every report." },
                { badge: "AI", title: "Anti-Hallucination", desc: "CNICs cross-checked character-by-character against the source document." },
                { badge: "0", title: "Zero Retention", desc: "Document files processed in memory only and never stored to disk." },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: "center", padding: "16px" }}>
                  <div style={{ display: "inline-block", padding: "6px 14px", backgroundColor: "#0b132b", color: "#ffffff", fontSize: "12px", fontWeight: 900, borderRadius: "8px", letterSpacing: "0.05em", marginBottom: "10px" }}>{item.badge}</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>{item.title}</div>
                  <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            {/* Founder Quote */}
            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", margin: "32px 0", textAlign: "center" }}>
              <p style={{ fontSize: "17px", color: "#0f172a", fontStyle: "italic", lineHeight: 1.6, margin: "0 0 12px 0" }}>
                &ldquo;We built PakkaScan because remote property buying should not feel like a leap of faith. Clarity is the ultimate safety net.&rdquo;
              </p>
              <p style={{ fontSize: "13px", color: "#64748b", fontWeight: 700, margin: 0 }}>— Founder, PakkaScan</p>
            </div>

            {/* Our Role callout */}
            <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "20px 24px", margin: "16px 0 32px 0" }}>
              <div style={{ fontSize: "15px", fontWeight: 800, color: "#1e3a8a", marginBottom: "10px" }}>Our Role in Your Due Diligence</div>
              <p style={{ fontSize: "14px", color: "#1e40af", lineHeight: 1.6, margin: 0 }}>
                PakkaScan is an AI assistant, not a law firm or government agency. It automates initial document checks to save you time, flag missing evidence, and catch hidden risks — before you hire expensive local legal counsel or hand over token money. For very high-value transactions, always confirm with a licensed lawyer and the relevant authority.
              </p>
            </div>

            <div style={{ backgroundColor: "#fef9c3", border: "1px solid #fde68a", borderRadius: "12px", padding: "20px 24px" }}>
              <p style={{ margin: 0, fontSize: "15px", color: "#713f12", lineHeight: 1.6 }}>
                <strong>This is not a substitute for a licensed lawyer.</strong> For very high-value transactions, always confirm with your lawyer and the relevant authority (NADRA, Sub-Registrar, Patwari). PakkaScan gives you the confidence to know when you need one ? and when your paperwork is genuinely clean.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: "48px", textAlign: "center" }}>
            <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "16px 32px", backgroundColor: "#16a34a", color: "#ffffff", fontWeight: 700, fontSize: "15px", borderRadius: "12px", textDecoration: "none", boxShadow: "0 4px 16px rgba(22,163,74,0.3)" }}>
              Try PakkaScan
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: "#0b132b", color: "#94a3b8", padding: "48px 24px 32px 24px", marginTop: "40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px", marginBottom: "32px" }}>
            <div>
              <div className={fraunces.className} style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff", marginBottom: "8px" }}>
                Pakka<span style={{ color: "#16a34a", fontStyle: "italic" }}>Scan</span>
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
                AI-powered document verification for Pakistani property transactions.
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Product</div>
              <Link href="/scan" style={footerLinkStyle}>Scan a Document</Link>
              <Link href="/sample-report" style={footerLinkStyle}>See a Sample Report</Link>
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
              <strong style={{ color: "#94a3b8" }}>Disclaimer:</strong> PakkaScan is an AI-powered assistive tool for reviewing Pakistani property documents. It is not a licensed lawyer, does not provide certified legal counsel, and does not confirm authenticity with issuing authorities (NADRA, PLRA, Sub-Registrar, Patwari). Reports are advisory. For high-value transactions, always confirm with qualified legal counsel and directly with the relevant authority. PakkaScan is not responsible for financial losses arising from reliance on its reports.
            </p>
            <p style={{ margin: 0 }}>? 2026 PakkaScan. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
