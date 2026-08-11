import { Fraunces } from "next/font/google";
import Link from "next/link";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

const WHATSAPP_URL = "https://wa.me/923156507067?text=" + encodeURIComponent("Hi PakkaScan, I have a pricing question.");

const navLinkStyle: React.CSSProperties = { color: "#cbd5e1", fontSize: "14px", fontWeight: 600, textDecoration: "none" };
const footerLinkStyle: React.CSSProperties = { display: "block", fontSize: "13px", color: "#94a3b8", textDecoration: "none", padding: "6px 0", lineHeight: 1.4 };

export const metadata = {
  title: "Pricing ? PakkaScan",
  description: "Three transparent tiers. Pay per report, no subscription. First scan free.",
};

const TIERS = [
  {
    name: "Rental Safety Check",
    price: "Rs 499",
    tagline: "For renters signing a new tenancy.",
    includes: [
      "Tenancy Agreement analysis (English + Urdu)",
      "Landlord CNIC verification",
      "Cross-check of rent, deposit, and duration",
      "Missing evidence checklist",
      "Bilingual verdict + next steps",
    ],
    idealFor: "You're about to sign a rent agreement and want to make sure nothing sneaky is in the fine print.",
    highlight: false,
  },
  {
    name: "Bayana Safety Check",
    price: "Rs 1,499",
    tagline: "Before you hand over any token money.",
    includes: [
      "Bayana / Agreement to Sell analysis",
      "Seller CNIC verification (with anti-hallucination guard)",
      "Current Fard (Ownership Record) cross-check",
      "Property address and area verification",
      "Cross-document reasoning across all three files",
      "Bilingual verdict + personalised next steps",
    ],
    idealFor: "You've agreed on a plot or house and are about to hand over the token payment. Get an independent second opinion first.",
    highlight: true,
  },
  {
    name: "Full Property Due Diligence",
    price: "Rs 2,999",
    tagline: "For property purchases at Sale Deed stage.",
    includes: [
      "Registered Sale Deed analysis",
      "Current Fard (Ownership Record)",
      "Mutation record (Sale / Gift / Mortgage / Inheritance)",
      "Seller CNIC verification",
      "Non-Encumbrance Certificate",
      "Full cross-document verification across 5+ files",
      "Bilingual verdict + comprehensive next-step checklist",
    ],
    idealFor: "You're finalising a serious property purchase (Rs 20 lakh+). Every document cross-checked for the full transaction.",
    highlight: false,
  },
];

const FAQ_MINI = [
  {
    q: "Is there a subscription?",
    a: "No. You pay per report. Once you've paid for a scan, that report is yours to keep.",
  },
  {
    q: "Why is the first scan free?",
    a: "PakkaScan is new in Pakistan. We want you to see the quality of the report before you pay anything. Try it once, then decide if it's worth it.",
  },
  {
    q: "What payment methods will you accept?",
    a: "Easypaisa, JazzCash, HBL/MCB/UBL debit and credit cards, and direct bank transfer. Payment integration launches shortly ? private beta users can use PakkaScan free right now.",
  },
  {
    q: "What if the report is wrong?",
    a: "Message us on WhatsApp. If PakkaScan gave you clearly incorrect information (fabricated a CNIC, missed obvious red flags in a clear document), we refund the scan and investigate. See our Terms for full policy.",
  },
];

export default function PricingPage() {
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
            <Link href="/about" style={navLinkStyle}>About</Link>
            <Link href="/faq" style={navLinkStyle}>FAQ</Link>
            <Link href="/contact" style={navLinkStyle}>Contact</Link>
            <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", padding: "8px 18px", backgroundColor: "#16a34a", color: "#ffffff", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>Try It</Link>
          </nav>
        </div>
      </div>

      <section style={{ backgroundColor: "#0b132b", color: "#ffffff", padding: "64px 24px 48px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "16px" }}>Simple Pricing</div>
          <h1 className={fraunces.className} style={{ fontSize: "44px", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 20px 0", lineHeight: 1.2 }}>
            Pay per <span style={{ color: "#16a34a", fontStyle: "italic" }}>report</span>. No subscription.
          </h1>
          <p style={{ fontSize: "17px", color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
            Your first scan is free. See the report quality yourself before spending a rupee.
          </p>
        </div>
      </section>

      <section style={{ padding: "48px 24px 64px 24px", backgroundColor: "#f8fafc" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          {TIERS.map((tier, i) => (
            <div key={i} style={{ backgroundColor: "#ffffff", border: tier.highlight ? "2px solid #16a34a" : "1px solid #e2e8f0", borderRadius: "16px", padding: "32px 24px", position: "relative", boxShadow: tier.highlight ? "0 10px 25px -5px rgba(22,163,74,0.15)" : "0 4px 6px -1px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column" }}>
              {tier.highlight && (
                <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#16a34a", color: "#ffffff", fontSize: "11px", fontWeight: 800, padding: "4px 12px", borderRadius: "20px", letterSpacing: "0.05em" }}>MOST POPULAR</div>
              )}
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>{tier.name}</div>
              <div style={{ fontSize: "40px", fontWeight: 900, color: "#0f172a", marginBottom: "6px", letterSpacing: "-0.02em" }}>{tier.price}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", lineHeight: 1.5 }}>{tier.tagline}</div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px", marginBottom: "20px", flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>What's included</div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {tier.includes.map((item, j) => (
                    <li key={j} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "6px 0", fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>
                      <span style={{ color: "#16a34a", fontWeight: 900, flexShrink: 0, width: "16px" }}>+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", padding: "12px 14px", marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Ideal for</div>
                <div style={{ fontSize: "12px", color: "#334155", lineHeight: 1.5 }}>{tier.idealFor}</div>
              </div>

              <Link href="/scan" style={{ display: "block", padding: "12px 20px", backgroundColor: tier.highlight ? "#16a34a" : "#0b132b", color: "#ffffff", fontWeight: 700, fontSize: "14px", borderRadius: "10px", textDecoration: "none", textAlign: "center" }}>Try This Scan</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing FAQ */}
      <section style={{ padding: "48px 24px 64px 24px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", margin: "0 0 32px 0", textAlign: "center", letterSpacing: "-0.02em" }}>Pricing Questions</h2>
          <div>
            {FAQ_MINI.map((item, i) => (
              <div key={i} style={{ borderBottom: "1px solid #e2e8f0", padding: "20px 4px" }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>{item.q}</div>
                <div style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6 }}>{item.a}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "40px", textAlign: "center" }}>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", backgroundColor: "#25D366", color: "#ffffff", fontWeight: 700, fontSize: "14px", borderRadius: "10px", textDecoration: "none" }}>
              Have another pricing question? Message us
            </a>
          </div>
        </div>
      </section>

      <footer style={{ backgroundColor: "#0b132b", color: "#94a3b8", padding: "48px 24px 32px 24px" }}>
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
              <strong style={{ color: "#94a3b8" }}>Disclaimer:</strong> PakkaScan is an AI-powered assistive tool. Not a licensed lawyer. Reports are advisory. Always confirm high-value transactions with qualified legal counsel.
            </p>
            <p style={{ margin: 0 }}>? 2026 PakkaScan. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
