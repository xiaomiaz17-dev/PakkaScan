import { Fraunces } from "next/font/google";
import Link from "next/link";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

const WHATSAPP_URL = "https://wa.me/923156507067?text=" + encodeURIComponent("Hi PakkaScan, I have a question.");
const SUPPORT_EMAIL = "support@pakkascan.com";

const navLinkStyle: React.CSSProperties = { color: "#cbd5e1", fontSize: "14px", fontWeight: 600, textDecoration: "none" };
const footerLinkStyle: React.CSSProperties = { display: "block", fontSize: "13px", color: "#94a3b8", textDecoration: "none", padding: "6px 0", lineHeight: 1.4 };

export const metadata = {
  title: "Contact PakkaScan",
  description: "Get in touch ? WhatsApp, email, or general questions.",
};

export default function ContactPage() {
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
            <Link href="/#how-it-works" style={navLinkStyle}>How it Works</Link>
            <Link href="/pricing" style={navLinkStyle}>Pricing</Link>
            <Link href="/about" style={navLinkStyle}>About</Link>
            <Link href="/faq" style={navLinkStyle}>FAQ</Link>
            <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", padding: "8px 18px", backgroundColor: "#16a34a", color: "#ffffff", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>Try It</Link>
          </nav>
        </div>
      </div>

      <section style={{ backgroundColor: "#0b132b", color: "#ffffff", padding: "64px 24px 48px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "16px" }}>Get in Touch</div>
          <h1 className={fraunces.className} style={{ fontSize: "44px", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 20px 0", lineHeight: 1.2 }}>
            Talk to <span style={{ color: "#16a34a", fontStyle: "italic" }}>us</span>
          </h1>
          <p style={{ fontSize: "17px", color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
            Questions, feedback, or issues? We reply.
          </p>
        </div>
      </section>

      <section style={{ padding: "48px 24px 64px 24px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {/* WhatsApp */}
          <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "16px", padding: "28px", display: "flex", alignItems: "flex-start", gap: "20px" }}>
            <div style={{ backgroundColor: "#25D366", color: "#ffffff", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>WhatsApp — fastest reply</div>
              <div style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6, marginBottom: "16px" }}>
                Message us on WhatsApp for any question about your scan, your account, or PakkaScan in general. Usually replied within a few hours during Pakistan business hours.
              </div>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", backgroundColor: "#25D366", color: "#ffffff", fontWeight: 700, fontSize: "14px", borderRadius: "10px", textDecoration: "none" }}>
                Message us on WhatsApp
              </a>
            </div>
          </div>

          {/* Email */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "28px", display: "flex", alignItems: "flex-start", gap: "20px" }}>
            <div style={{ backgroundColor: "#0b132b", color: "#ffffff", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "20px", fontWeight: 900 }}>@</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>Email</div>
              <div style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6, marginBottom: "16px" }}>
                Better for longer questions, feedback, or business enquiries. We reply within 24 hours.
              </div>
              <a href={"mailto:" + SUPPORT_EMAIL} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", backgroundColor: "#0b132b", color: "#ffffff", fontWeight: 700, fontSize: "14px", borderRadius: "10px", textDecoration: "none" }}>
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>

          {/* Common Questions Callout */}
          <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "16px", padding: "24px" }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e3a8a", marginBottom: "10px" }}>Before you message us</div>
            <div style={{ fontSize: "14px", color: "#1e40af", lineHeight: 1.6, marginBottom: "14px" }}>
              Most common questions are answered in our FAQ — worth a quick look first.
            </div>
            <Link href="/faq" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 700, color: "#1e3a8a", textDecoration: "underline" }}>
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>

      {/* Footer (same as About) */}
      <footer style={{ backgroundColor: "#0b132b", color: "#94a3b8", padding: "48px 24px 32px 24px", marginTop: "40px" }}>
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
              <strong style={{ color: "#94a3b8" }}>Disclaimer:</strong> PakkaScan is an AI-powered assistive tool for reviewing Pakistani property documents. It is not a licensed lawyer, does not provide certified legal counsel, and does not confirm authenticity with issuing authorities. Reports are advisory. Always confirm high-value transactions with qualified legal counsel.
            </p>
            <p style={{ margin: 0 }}>? 2026 PakkaScan. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
