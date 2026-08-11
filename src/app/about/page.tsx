import { Fraunces } from "next/font/google";
import Link from "next/link";

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
            <Link href="/#how-it-works" style={navLinkStyle}>How it Works</Link>
            <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
            <Link href="/faq" style={navLinkStyle}>FAQ</Link>
            <Link href="/contact" style={navLinkStyle}>Contact</Link>
            <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", padding: "8px 18px", backgroundColor: "#16a34a", color: "#ffffff", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>Try It</Link>
          </nav>
        </div>
      </div>

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
              No jargon. No wait. No middleman. Just an honest second opinion before you hand over any money.
            </p>

            <div style={{ backgroundColor: "#fef9c3", border: "1px solid #fde68a", borderRadius: "12px", padding: "20px 24px" }}>
              <p style={{ margin: 0, fontSize: "15px", color: "#713f12", lineHeight: 1.6 }}>
                <strong>This is not a substitute for a licensed lawyer.</strong> For very high-value transactions, always confirm with your lawyer and the relevant authority (NADRA, Sub-Registrar, Patwari). PakkaScan gives you the confidence to know when you need one ? and when your paperwork is genuinely clean.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: "48px", textAlign: "center" }}>
            <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "16px 32px", backgroundColor: "#16a34a", color: "#ffffff", fontWeight: 700, fontSize: "15px", borderRadius: "12px", textDecoration: "none", boxShadow: "0 4px 16px rgba(22,163,74,0.3)" }}>
              Try PakkaScan ? First Scan Free
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
