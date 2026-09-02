"use client";

import React, { useState, useEffect } from "react";
import { Fraunces } from "next/font/google";
import WhatsAppFAB from "@/components/WhatsAppFAB";
import ReportDemoSlider from "@/components/ReportDemoSlider";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

type SessionUser = { email: string; name: string | null };
type PaymentsMode = "beta" | "paid";
type ReportType = "rental" | "bayana" | "full_dd";

const WHATSAPP_URL = "https://wa.me/923156507067?text=" + encodeURIComponent("Hi PakkaScan, I have a question.");

const FAQ_ITEMS = [
  {
    q: "What is PakkaScan?",
    a: "PakkaScan is an AI-powered document analyser built for Pakistani property transactions. Upload a Bayana, Fard, Sale Deed, CNIC, or any related document, and PakkaScan reads key clauses in English and Urdu, cross-checks the details, and typically returns a clear verdict within a few minutes.",
  },
  {
    q: "What does a PakkaScan report actually look like?",
    a: "You can see a full sample report at pakkascan.com/sample-report before you buy. It shows a fictional but realistic Bayana scenario where PakkaScan flags a high-risk deal \u2014 price under-declaration, unregistered Power of Attorney, one-sided forfeiture clause, and missing witness CNICs. The sample matches exactly what you get when you scan your own documents, in English and Urdu.",
  },
  {
    q: "Is PakkaScan a substitute for a lawyer?",
    a: "No. PakkaScan is an assistive tool  -  not a licensed lawyer or certified legal counsel. For very high-value transactions, always confirm your paperwork with a qualified lawyer and directly with the relevant authority (NADRA, Sub-Registrar, Patwari). PakkaScan helps you know when your papers look clean, and when you need a second opinion.",
  },
  {
    q: "What documents can PakkaScan read?",
    a: "Bayana / Agreement to Sell, Registered Sale Deed, Tenancy Agreements, CNIC / NICOP / POC, Fard (ownership record), Mutation (Sale / Gift / Mortgage / Inheritance), Power of Attorney, Gift Deed, Non-Encumbrance Certificate, and more. PakkaScan works best on typed documents and clean phone photos. Very old handwritten records (Shikastah, faded ink) may not extract fully.",
  },
  {
    q: "What if PakkaScan misses something?",
    a: "PakkaScan flags what it finds AND what it can't verify. If a critical field is missing (like a CNIC that was fabricated by the AI or a document too blurry to read), PakkaScan tells you clearly and adds it to the 'What To Do Next' checklist. When in doubt, message us on WhatsApp  -  a real person will help.",
  },
  {
    q: "What about my privacy?",
    a: "Uploads are processed to produce your report. We do not sell your files. Account email, scan history, and a PDF hash record may be kept so you can reopen or verify a report. Original files are not used as a public archive. See Security and Privacy for retention.",
  },
  {
    q: "How does PakkaScan protect my CNIC and land details?",
    a: "Original files are processed in memory only and not written to disk. We do not store your uploaded PDFs or images. Extracted text may be cached briefly (up to 24 hours), then wiped. Account email, scan dates, and report findings are stored so you can return to results. We do not sell personal data.",
  },
  {
    q: "How accurate is the AI?",
    a: "PakkaScan uses layered verification: OCR reads the text, regex extracts structured fields, and an LLM validates everything against the source document with anti-hallucination checks. Fabricated CNICs are stripped. Ambiguous fields are flagged. If the AI is unsure, it says so rather than guess. Always check the 'Missing Evidence' section for anything not confirmed.",
  },
];

function NavBar({ sessionUser, sessionLoaded, onSignOut }: { sessionUser: SessionUser | null; sessionLoaded: boolean; onSignOut: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "rgba(11, 19, 43, 0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#0b132b", border: "2px solid #ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" style={{ color: "#ffffff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className={fraunces.className} style={{ fontSize: "20px", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em" }}>
            Pakka<span style={{ color: "#16a34a", fontStyle: "italic" }}>Scan</span>
          </div>
        </a>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ display: "none", background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#ffffff", padding: "6px 10px", fontSize: "18px", cursor: "pointer", lineHeight: 1 }} className="pks-mobile-menu-btn" aria-label="Menu" aria-expanded={mobileMenuOpen}>
          {mobileMenuOpen ? "✕" : "☰"}
        </button>

        <nav className="pks-nav-links" style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <a href="/#how-it-works" style={navLinkStyle}>How it Works</a>
          <a href="/#pricing" style={navLinkStyle}>Pricing</a>
          <a href="/about" style={navLinkStyle}>About</a>
          <a href="/#faq" style={navLinkStyle}>FAQ</a>
          <a href="/contact" style={navLinkStyle}>Contact</a>

          {!sessionLoaded ? null : sessionUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "8px", paddingLeft: "16px", borderLeft: "1px solid rgba(255,255,255,0.15)" }}>
              <span style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: 600, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sessionUser.email}</span>
              <button onClick={onSignOut} style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Sign out</button>
            </div>
          ) : (
            <a href="/login" style={{ display: "inline-flex", alignItems: "center", padding: "8px 18px", backgroundColor: "#16a34a", color: "#ffffff", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none", marginLeft: "8px" }}>Sign in</a>
          )}
        </nav>
      </div>

      {mobileMenuOpen && (
        <div style={{ display: "none", padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", backgroundColor: "#0b132b" }} className="pks-mobile-menu">
          <a href="/#how-it-works" style={{ ...navLinkStyle, display: "block", padding: "8px 0" }} onClick={() => setMobileMenuOpen(false)}>How it Works</a>
          <a href="/#pricing" style={{ ...navLinkStyle, display: "block", padding: "8px 0" }} onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <a href="/about" style={{ ...navLinkStyle, display: "block", padding: "8px 0" }} onClick={() => setMobileMenuOpen(false)}>About</a>
          <a href="/#faq" style={{ ...navLinkStyle, display: "block", padding: "8px 0" }} onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          <a href="/contact" style={{ ...navLinkStyle, display: "block", padding: "8px 0" }} onClick={() => setMobileMenuOpen(false)}>Contact</a>
          {sessionUser ? (
            <button onClick={onSignOut} style={{ display: "block", marginTop: "12px", backgroundColor: "rgba(255,255,255,0.08)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", width: "100%" }}>Sign out ({sessionUser.email})</button>
          ) : (
            <a href="/login" style={{ display: "block", marginTop: "12px", padding: "10px", backgroundColor: "#16a34a", color: "#ffffff", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none", textAlign: "center" }}>Sign in</a>
          )}
        </div>
      )}
    </div>
  );
}

const navLinkStyle: React.CSSProperties = { color: "#cbd5e1", fontSize: "14px", fontWeight: 600, textDecoration: "none" };

function Footer() {
  return (
    <footer style={{ backgroundColor: "#0b132b", color: "#94a3b8", padding: "48px 24px 32px 24px", marginTop: "80px" }}>
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
            <a href="/scan" style={footerLinkStyle}>Scan a Document</a>
              <a href="/sample-report" style={footerLinkStyle}>Sample Report</a>
            <a href="/sample-report" style={footerLinkStyle}>See a Sample Report</a>
            <a href="/#pricing" style={footerLinkStyle}>Pricing</a>
            <a href="/#how-it-works" style={footerLinkStyle}>How it Works</a>
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Company</div>
            <a href="/about" style={footerLinkStyle}>About</a>
            <a href="/contact" style={footerLinkStyle}>Contact</a>
            <a href="/#faq" style={footerLinkStyle}>FAQ</a>
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Legal</div>
            <a href="/terms" style={footerLinkStyle}>Terms of Service</a>
            <a href="/privacy" style={footerLinkStyle}>Privacy Policy</a>
          <a href="/limitations" style={footerLinkStyle}>Limitations</a>
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
          <p style={{ margin: 0 }}>&copy; 2026 PakkaScan. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

const footerLinkStyle: React.CSSProperties = { display: "block", fontSize: "13px", color: "#94a3b8", textDecoration: "none", padding: "6px 0", lineHeight: 1.4 };

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "28px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)", ...style }}>
      {children}
    </div>
  );
}

function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #e2e8f0" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "18px 4px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
        <span>{q}</span>
        <span style={{ fontSize: "20px", color: "#64748b", transform: open ? "rotate(45deg)" : "rotate(0)", transition: "transform 0.2s" }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 4px 20px 4px", fontSize: "14px", color: "#475569", lineHeight: 1.7 }}>{a}</div>
      )}
    </div>
  );
}

function PricingCta({
  reportType,
  pricePkr,
  priceUsd,
  highlight,
  paymentsMode,
  sessionUser,
  market,
}: {
  reportType: ReportType;
  pricePkr: string;
  priceUsd: string;
  highlight: boolean;
  paymentsMode: PaymentsMode;
  sessionUser: SessionUser | null;
  market: "PKR" | "USD";
}) {
  const [loading, setLoading] = useState(false);

  const cardBtnStyle: React.CSSProperties = {
    display: "block",
    padding: "12px 20px",
    backgroundColor: highlight ? "#16a34a" : "#0b132b",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "14px",
    lineHeight: 1.4,
    borderRadius: "10px",
    textDecoration: "none",
    textAlign: "center",
    border: "none",
    cursor: loading ? "wait" : "pointer",
    width: "100%",
    boxSizing: "border-box",
    opacity: loading ? 0.7 : 1,
    fontFamily: "inherit",
  };
  const cardOutlineStyle: React.CSSProperties = {
    display: "block",
    padding: "12px 20px",
    backgroundColor: "transparent",
    color: highlight ? "#15803d" : "#0b132b",
    fontWeight: 700,
    fontSize: "14px",
    lineHeight: 1.4,
    borderRadius: "10px",
    textDecoration: "none",
    textAlign: "center",
    border: highlight ? "2px solid #16a34a" : "2px solid #0b132b",
    cursor: loading ? "wait" : "pointer",
    width: "100%",
    boxSizing: "border-box",
    opacity: loading ? 0.7 : 1,
    fontFamily: "inherit",
  };

  const raastBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px 20px",
    backgroundColor: "#f1f5f9",
    color: "#94a3b8",
    fontWeight: 700,
    fontSize: "14px",
    lineHeight: 1.4,
    borderRadius: "10px",
    textAlign: "center",
    border: "1px solid #e2e8f0",
    cursor: "not-allowed",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    marginBottom: "8px",
  };

  const comingSoonBadge: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 800,
    padding: "2px 8px",
    backgroundColor: "#e2e8f0",
    color: "#64748b",
    borderRadius: "10px",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  };

  // BETA MODE: single button, all free
  if (paymentsMode === "beta") {
    return <a href="/scan" style={cardBtnStyle}>Get Started</a>;
  }

  // PAID MODE: not signed in => single "Sign in to Buy" button
  if (!sessionUser) {
    return <a href="/login" style={cardBtnStyle}>Sign in to Buy</a>;
  }

  // PAID MODE: signed in  -  show BOTH buttons (Raast disabled, Card active)
  async function handleCardClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType }),
      });
      const data = await res.json();
      if (data.alreadyEntitled) {
        window.location.href = data.redirectTo || "/scan";
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Checkout failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      alert("Checkout failed. Please try again.");
      setLoading(false);
    }
  }

if (market === "PKR") {
    return (
      <a
        href={`/payment/raast?tier=${reportType}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "12px 20px",
          backgroundColor: "#0f766e",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: "14px",
          lineHeight: 1.4,
          borderRadius: "10px",
          textAlign: "center",
          border: "none",
          cursor: "pointer",
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "inherit",
          textDecoration: "none",
        }}
      >
        Pay with Raast / JazzCash — Rs {pricePkr}
      </a>
    );
  }
  return (
    <button onClick={handleCardClick} disabled={loading} style={cardBtnStyle}>
      {loading ? "Loading..." : `Pay with Card — $${priceUsd}`}
    </button>
  );
}
export default function LandingPage() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [paymentsMode, setPaymentsMode] = useState<PaymentsMode>("beta");
  const [market, setMarket] = useState<"PKR" | "USD">("PKR");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : { authenticated: false }))
      .then((data) => {
        if (cancelled) return;
        if (data.authenticated) setSessionUser(data.user);
        setSessionLoaded(true);
      })
      .catch(() => { if (!cancelled) setSessionLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetch("/api/config/payments")
      .then((r) => (r.ok ? r.json() : { mode: "beta" }))
      .then((data) => setPaymentsMode(data.mode === "paid" ? "paid" : "beta"))
      .catch(() => {});
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setSessionUser(null);
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{" section[id] { scroll-margin-top: 80px; }@media (max-width: 768px) { .pks-nav-links { display: none !important; } .pks-mobile-menu-btn { display: inline-block !important; } .pks-mobile-menu { display: block !important; } .pks-hero-h1 { font-size: 32px !important; } .pks-hero-tagline { font-size: 15px !important; } .pks-hero-ctas { flex-direction: column !important; width: 100% !important; } .pks-hero-ctas > a { width: 100% !important; text-align: center !important; } .pks-price-grid { grid-template-columns: 1fr !important; } .pks-how-grid { grid-template-columns: 1fr !important; } .pks-trust-grid { grid-template-columns: 1fr !important; } }"}</style>

      <NavBar sessionUser={sessionUser} sessionLoaded={sessionLoaded} onSignOut={handleSignOut} />

      {/* HERO */}
      <section style={{ backgroundColor: "#0b132b", color: "#ffffff", padding: "80px 24px 100px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ width: "84px", height: "84px", borderRadius: "50%", backgroundColor: "#0b132b", border: "3px solid #ffffff", boxShadow: "0 0 0 4px rgba(255,255,255,0.15), inset 0 0 12px rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px auto" }}>
            <svg width="40" height="40" style={{ color: "#ffffff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className={fraunces.className} style={{ fontSize: "44px", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "12px" }}>
            Pakka<span style={{ color: "#16a34a", fontStyle: "italic" }}>Scan</span>
          </div>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "40px" }}>
            LEGAL DUE DILIGENCE <span style={{ margin: "0 6px", color: "#16a34a" }}>*</span> AI-POWERED
          </div>
          <h1 className="pks-hero-h1" style={{ fontSize: "40px", fontWeight: 800, lineHeight: 1.2, margin: "0 0 20px 0", letterSpacing: "-0.02em" }}>
            Don&apos;t hand over your <span style={{ color: "#d4af37" }}>deposit</span> until PakkaScan has read the fine print you didn&apos;t.
          </h1>
          <p className="pks-hero-tagline" style={{ fontSize: "17px", color: "#f1f5f9", lineHeight: 1.65, maxWidth: "580px", margin: "0 auto 36px auto", fontWeight: 500 }}>
            Buyer-side check of the papers you were handed - parties, dates, money, and clause flags in English and Urdu. Most scans finish in minutes; busy periods can take longer.
          </p>
          <div className="pks-hero-ctas" style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap", marginBottom: "28px" }}>
            <a href="/scan" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px 32px", backgroundColor: "#16a34a", color: "#ffffff", fontWeight: 700, fontSize: "15px", borderRadius: "12px", textDecoration: "none", boxShadow: "0 4px 16px rgba(22,163,74,0.35)" }}>
              Scan a Document
            </a>
            <a href="/sample-report" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "16px 32px", backgroundColor: "rgba(255,255,255,0.18)", color: "#ffffff", fontWeight: 700, fontSize: "15px", borderRadius: "12px", textDecoration: "none", border: "2px solid rgba(255,255,255,0.55)", boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }}>
              See a Sample Report
            </a>
          </div>
          <p style={{ fontSize: "14px", color: "#f8fafc", lineHeight: 1.5, maxWidth: "640px", margin: "0 auto", fontWeight: 600 }}>
            Hash-verifiable PDF Passports · Bilingual English + Nastaliq Urdu · Built for buyers in Pakistan, UK, UAE &amp; US
          </p>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ backgroundColor: "#f8fafc", padding: "48px 24px", borderBottom: "1px solid #e2e8f0" }}>
        <div className="pks-trust-grid" style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px" }}>
          {[
            { icon: "EN\u2022UR", title: "Bilingual reports", desc: "Verdicts and key summaries in English and Urdu (Nastaliq) where available." },
            { icon: "AI", title: "Anti-hallucination guard", desc: "CNIC digits checked against the uploaded page (not NADRA). Invented numbers are dropped." },
            { icon: "VERIFY", title: "Public verification", desc: "Every report gets a QR + reference code. Anyone can confirm authenticity at pakkascan.com/verify - no login, no document contents shared." },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "0.05em", marginBottom: "12px", display: "inline-block", padding: "8px 16px", backgroundColor: "#0b132b", color: "#ffffff", borderRadius: "8px" }}>{item.icon}</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>{item.title}</div>
              <div style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDER STORY */}
      <section style={{ backgroundColor: "#0b132b", color: "#fff", padding: "40px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "#e2e8f0", margin: "0 0 12px", fontStyle: "italic" }}>
            &ldquo;The documents looked official. Everyone assumed they were fine. It took a lawyer three days and Rs 30,000 to confirm they weren&apos;t. We built PakkaScan so the next buyer doesn&apos;t learn that lesson the hard way.&rdquo;
          </p>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
            — Founder · <a href="/about" style={{ color: "#86efac", fontWeight: 700 }}>Full story on About</a>
          </p>
        </div>
      </section>
      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "72px 24px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>How It Works</h2>
            <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>Four steps. Usually a few minutes. No jargon.</p>
          </div>
          <div className="pks-how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
            {[
              { num: "01", title: "Upload", desc: "Upload your Bayana, Fard, Sale Deed, CNIC, or any Pakistani property document. Phone photos work fine." },
              { num: "02", title: "Analyse", desc: "Cross-checks parties, dates, and amounts across files; checks CNIC digits on the page; flags one-sided clauses." },
              { num: "03", title: "Verdict", desc: "Proceed, Proceed With Caution, or Do Not Proceed - plus next steps you can paste into WhatsApp." },
              { num: "04", title: "Verify", desc: "Every report gets a QR code + reference. Share with landlord or buyer - they scan to confirm authenticity, no login." },
            ].map((step, i) => (
              <Card key={i}>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "#16a34a", letterSpacing: "0.1em", marginBottom: "8px" }}>{step.num}</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", marginBottom: "10px" }}>{step.title}</div>
                <div style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6 }}>{step.desc}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "72px 24px", backgroundColor: "#f8fafc" }}>
        <div style={{ maxWidth: 900, margin: "0 auto 24px", padding: "16px 20px", borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, color: "#065f46", fontWeight: 600, flex: "1 1 220px" }}>
            See what a Full DD report looks like — no signup or credit required.
          </div>
          <a href="/sample-report" style={{ padding: "10px 16px", borderRadius: 8, background: "#0d9488", color: "#fff", fontWeight: 800, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>
            See sample report →
          </a>
        </div>
        
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>Pricing</h2>
            <p style={{ fontSize: "16px", color: "#64748b", margin: 0 }}>Pay per report. No subscription. No hidden fees.</p>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "8px 0 16px 0" }}>Choose local or international payment. One button per plan — no clutter.</p>
            <div style={{ display: "inline-flex", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden", background: "#fff" }}>
              <button type="button" onClick={() => setMarket("PKR")} style={{ padding: "10px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: market === "PKR" ? "#0f766e" : "transparent", color: market === "PKR" ? "#fff" : "#64748b" }}>Local (PKR)</button>
              <button type="button" onClick={() => setMarket("USD")} style={{ padding: "10px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: market === "USD" ? "#0b132b" : "transparent", color: market === "USD" ? "#fff" : "#64748b" }}>International (USD)</button>
            </div>
          </div>
          <div className="pks-price-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            {([
              { name: "Rental Safety Check", pricePkr: "499", priceUsd: "4.99", reportType: "rental" as ReportType, includes: ["Tenancy Agreement analysis", "Landlord CNIC consistency check", "Missing evidence checklist", "Verdict + up to 3 next steps", "Email summary + WhatsApp support"], desc: "For renters signing a new tenancy.", highlight: false },
              { name: "Bayana Safety Check", pricePkr: "1,499", priceUsd: "9.99", reportType: "bayana" as ReportType, includes: ["Bayana / Agreement to Sell", "Seller CNIC consistency check", "Current Fard (Ownership Record)", "Cross-document reasoning", "Combined verdict + up to 5 next steps", "Full email report + WhatsApp support"], desc: "Before you hand over any token money.", highlight: true },
              { name: "Full Property Due Diligence", pricePkr: "2,999", priceUsd: "19.99", reportType: "full_dd" as ReportType, includes: ["Registered Sale Deed + Fard + Mutation", "Seller CNIC + Non-Encumbrance Certificate", "Full 5-file cross-verification", "Category scores + timeline + evidence appendix", "Verdict + up to 10 next steps", "Priority WhatsApp support"], desc: "For property purchases at Sale Deed stage.", highlight: false },
            ]).map((tier, i) => (
              <div key={i} className={tier.highlight ? "pks-pricing-card pks-pricing-card-highlight" : "pks-pricing-card"} style={{ backgroundColor: "#ffffff", border: tier.highlight ? "2px solid #16a34a" : "1px solid #e2e8f0", borderRadius: "16px", padding: "28px", position: "relative", boxShadow: tier.highlight ? "0 10px 25px -5px rgba(22,163,74,0.15)" : "0 4px 6px -1px rgba(0,0,0,0.02)", transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease" }}>
                {tier.highlight && (
                  <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#16a34a", color: "#ffffff", fontSize: "11px", fontWeight: 800, padding: "4px 12px", borderRadius: "20px", letterSpacing: "0.05em" }}>MOST POPULAR</div>
                )}
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>{tier.name}</div>
                <div style={{ fontSize: "30px", fontWeight: 900, color: "#0f172a", marginBottom: "4px", letterSpacing: "-0.02em" }}>
                  {market === "PKR" ? `Rs ${tier.pricePkr}` : `$${tier.priceUsd}`}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
                  {market === "PKR" ? `or $${tier.priceUsd} USD` : `or Rs ${tier.pricePkr} PKR`}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>{tier.desc}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
                  {tier.includes.map((item, j) => (
                    <li key={j} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "6px 0", fontSize: "14px", color: "#334155" }}>
                      <span style={{ color: "#16a34a", fontWeight: 900, flexShrink: 0 }}>+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <PricingCta
                  reportType={tier.reportType}
                  pricePkr={tier.pricePkr}
                  priceUsd={tier.priceUsd}
                  highlight={tier.highlight}
                  paymentsMode={paymentsMode}
                  sessionUser={sessionUser}
                  market={market}
                />
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "32px" }}>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              {paymentsMode === "beta" ? (
                <>
                  Try PakkaScan now while in private beta.
                </>
              ) : (
                <>
                  All reports are paid per scan. Pakistan: Raast / JazzCash. International: Pay with Card (USD).
                </>
              )}
            </p>
            <a href="/pricing" style={{ display: "inline-block", marginTop: "16px", marginRight: "12px", padding: "10px 20px", color: "#0b132b", fontWeight: 700, fontSize: "14px", textDecoration: "none", borderBottom: "2px solid #16a34a" }}>Compare all features &rarr;</a>
            <a href="/sample-report" style={{ display: "inline-block", marginTop: "16px", padding: "10px 20px", color: "#0b132b", fontWeight: 700, fontSize: "14px", textDecoration: "none", borderBottom: "2px solid #94a3b8" }}>See a sample report &rarr;</a>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE  -  anchor value vs traditional lawyer */}
      <section style={{ padding: "72px 24px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>Why not just hire a lawyer?</h2>
            <p style={{ fontSize: "15px", color: "#64748b", margin: 0, maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>You should  -  for the big stuff. But most property checks don&rsquo;t need a Rs 50,000 retainer. Lawyers send formal memos; PakkaScan gives bilingual flags you can paste straight into WhatsApp with an agent.</p>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th style={{ padding: "16px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: "12px", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}></th>
                  <th style={{ padding: "16px", textAlign: "center", fontWeight: 800, color: "#0b132b", fontSize: "14px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#ecfdf5" }}>PakkaScan</th>
                  <th style={{ padding: "16px", textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: "14px", borderBottom: "1px solid #e2e8f0" }}>Property Lawyer</th>
                  <th style={{ padding: "16px", textAlign: "center", fontWeight: 700, color: "#64748b", fontSize: "14px", borderBottom: "1px solid #e2e8f0" }}>DIY / Ask a friend</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "16px", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>Cost</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#065f46", fontWeight: 700, borderBottom: "1px solid #f1f5f9", backgroundColor: "#f0fdf4" }}>Rs 499 &ndash; 2,999</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#334155", borderBottom: "1px solid #f1f5f9" }}>Rs 25,000 &ndash; 75,000</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#334155", borderBottom: "1px solid #f1f5f9" }}>Free (risky)</td>
                </tr>
                <tr>
                  <td style={{ padding: "16px", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>Turnaround</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#065f46", fontWeight: 700, borderBottom: "1px solid #f1f5f9", backgroundColor: "#f0fdf4" }}>Typically a few minutes</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#334155", borderBottom: "1px solid #f1f5f9" }}>3 &ndash; 10 working days</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#334155", borderBottom: "1px solid #f1f5f9" }}>Hours of Googling</td>
                </tr>
                <tr>
                  <td style={{ padding: "16px", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>Bilingual (English + Urdu)</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#16a34a", fontSize: "18px", fontWeight: 800, borderBottom: "1px solid #f1f5f9", backgroundColor: "#f0fdf4" }}>&#10003;</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#94a3b8", borderBottom: "1px solid #f1f5f9" }}>Rarely</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#dc2626", fontSize: "18px", fontWeight: 800, borderBottom: "1px solid #f1f5f9" }}>&#10007;</td>
                </tr>
                <tr>
                  <td style={{ padding: "16px", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>Structured risk score</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#16a34a", fontSize: "18px", fontWeight: 800, borderBottom: "1px solid #f1f5f9", backgroundColor: "#f0fdf4" }}>&#10003;</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#94a3b8", borderBottom: "1px solid #f1f5f9" }}>Narrative only</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#dc2626", fontSize: "18px", fontWeight: 800, borderBottom: "1px solid #f1f5f9" }}>&#10007;</td>
                </tr>
                <tr>
                  <td style={{ padding: "16px", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>Shareable verification link</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#16a34a", fontSize: "18px", fontWeight: 800, borderBottom: "1px solid #f1f5f9", backgroundColor: "#f0fdf4" }}>&#10003;</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#dc2626", fontSize: "18px", fontWeight: 800, borderBottom: "1px solid #f1f5f9" }}>&#10007;</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#dc2626", fontSize: "18px", fontWeight: 800, borderBottom: "1px solid #f1f5f9" }}>&#10007;</td>
                </tr>
                <tr>
                  <td style={{ padding: "16px", fontWeight: 700, color: "#0f172a" }}>Best for</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#065f46", borderBottom: "1px solid #f1f5f9", backgroundColor: "#f0fdf4", fontSize: "13px", lineHeight: 1.5 }}>Bayana, rental, quick DD before payment</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#334155", fontSize: "13px", lineHeight: 1.5 }}>Complex disputes, litigation, big commercial deals</td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#334155", fontSize: "13px", lineHeight: 1.5 }}>Nothing you care about</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: "13px", color: "#64748b", textAlign: "center", marginTop: "20px", maxWidth: "700px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            PakkaScan doesn&rsquo;t replace a property lawyer for a Rs 5 crore commercial deal or an active dispute. But for the 90% of everyday property paperwork &mdash; tenancy agreements, Bayanas, plot purchases &mdash; it gives you a structured second look before you pay.
          </p>
        </div>
      </section>

      {/* WHAT WE SCAN */}
      <section style={{ padding: "64px 24px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>What We Scan</h2>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 32px 0" }}>All Pakistani property documents supported. Auto-detected  -  no need to sort first.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
            {["Bayana / Agreement to Sell", "Registered Sale Deed", "Tenancy Agreement", "CNIC / NICOP / POC", "Fard (Ownership)", "Mutation (Sale)", "Mutation (Gift)", "Mutation (Mortgage)", "Mutation (Inheritance)", "Power of Attorney", "Gift Deed (Hiba)", "Non-Encumbrance Certificate"].map((doc, i) => (
              <div key={i} style={{ padding: "10px 16px", backgroundColor: "#f0fdf4", color: "#166534", fontSize: "13px", fontWeight: 600, border: "1px solid #bbf7d0", borderRadius: "8px" }}>{doc}</div>
            ))}
          </div>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "20px" }}>Have a different document? Upload it anyway  -  our auto-detection engine will parse and highlight key terms.</p>
        </div>
      </section>

      <ReportDemoSlider />
      {/* PASSPORT PREVIEW */}
      <section style={{ padding: "56px 24px", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "center" }} className="pks-passport-preview">
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>What you walk away with</h2>
            <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.6, margin: "0 0 16px" }}>
              A hash-verifiable PDF Property Passport: risk score, bilingual verdict, flagged clauses, and a QR code anyone can check — without seeing your full documents.
            </p>
            <ul style={{ margin: "0 0 20px", paddingLeft: 18, color: "#334155", fontSize: 14, lineHeight: 1.7 }}>
              <li>Red-flag clauses ready to paste into WhatsApp with an agent</li>
              <li>Reference code + QR for authenticity</li>
              <li>SHA-256 hash so the PDF can&apos;t be quietly altered</li>
            </ul>
            <a href="/sample-report" style={{ fontWeight: 800, color: "#0f766e", textDecoration: "none" }}>Open the full sample report →</a>
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 20, boxShadow: "0 12px 40px rgba(15,23,42,0.08)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>SAMPLE PASSPORT</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 4 }}>Bayana Safety Check</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Ref: PKS-SAMPLE-2026-DEMO</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#991b1b" }}>RISK</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#991b1b" }}>8 / 10</div>
              </div>
              <div style={{ flex: 1, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9a3412" }}>VERDICT</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#9a3412" }}>DO NOT PROCEED</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#b91c1c", background: "#fef2f2", borderRadius: 8, padding: "8px 10px", marginBottom: 12, borderLeft: "3px solid #dc2626" }}>
              Flagged: price under-declaration · weak PoA — paste into WhatsApp with your agent.
            </div>
            <div style={{ fontSize: 11, color: "#64748b", fontFamily: "ui-monospace, monospace" }}>
              QR → pakkascan.com/verify/PKS-SAMPLE-2026-DEMO
            </div>
          </div>
        </div>
        <style>{`@media (max-width: 768px) { .pks-passport-preview { grid-template-columns: 1fr !important; } }`}</style>
      </section>
      {/* TESTIMONIALS - pulled-headline design, on-brand light aesthetic */}
      <section style={{ padding: "72px 24px", backgroundColor: "#f8fafc" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div style={{ display: "inline-block", padding: "4px 12px", backgroundColor: "#ecfdf5", color: "#065f46", fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", borderRadius: "6px", marginBottom: "12px", textTransform: "uppercase" }}>Beta Feedback</div>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>What early users are saying</h2>
            <p style={{ fontSize: "15px", color: "#64748b", margin: 0, maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>Real feedback from Karachi beta testers who used PakkaScan before hitting sign on their paperwork.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
            {[
              {
                headline: "Saved me from a major headache before giving token money.",
                preview: "I was about to hand over the token money on an apartment near PECHS. PakkaScan flagged a missing witness CNIC and a weird forfeiture clause in seconds \u2014 got both fixed with the seller before paying.",
                name: "Alisha",
                location: "Karachi",
                service: "Bayana Check",
              },
              {
                headline: "Finally showed us exactly what we were signing.",
                preview: "Renting out our house used to mean trusting whatever template the agent brought. PakkaScan pulled out the security deposit and maintenance terms in English AND Urdu. Wish I\u2019d had this two tenants ago.",
                name: "Maryam",
                location: "Karachi",
                service: "Rental Check",
              },
              {
                headline: "Gave my overseas family complete peace of mind.",
                preview: "I was sending money from London for a family plot in Karachi and needed independent eyes on the paperwork before wiring anything. My cousin ran the registry and transfer docs through PakkaScan \u2014 every CNIC checked, dates verified, and I got a verification link I could show my lawyer here. Wired the funds the same day.",
                name: "Yasmin",
                location: "London, UK",
                service: "Full Due Diligence",
              },
              {
                headline: "Caught one CNIC digit that was wrong on the original.",
                preview: "Urdu property paperwork is a nightmare if you\u2019re not a lawyer. Uploaded our Fard and Sale Deed and got everything back as a clear risk breakdown \u2014 the CNIC-by-CNIC check caught an error that could have been a serious problem.",
                name: "Maria",
                location: "Karachi",
                service: "Title Verification",
              },
            ].map((t, i) => (
              <div key={i} style={{ padding: "28px 24px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <h3 className={fraunces.className} style={{ fontSize: "19px", fontWeight: 700, color: "#0f172a", lineHeight: 1.35, margin: "0 0 14px 0", letterSpacing: "-0.01em" }}>&ldquo;{t.headline}&rdquo;</h3>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.65, margin: "0 0 20px 0", flex: 1 }}>{t.preview}</p>
                <div style={{ paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "2px" }}>{t.name}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>{t.location}</div>
                  <div style={{ display: "inline-block", padding: "3px 10px", backgroundColor: "#ecfdf5", color: "#065f46", fontSize: "11px", fontWeight: 700, borderRadius: "999px", letterSpacing: "0.02em" }}>{t.service} &middot; Beta</div>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", marginTop: "32px", fontStyle: "italic" }}>Quoted with permission from real beta users. Names shown as they wished to be identified.</p>
        </div>
      </section>
      {/* FAQ */}
      <section id="faq" style={{ padding: "72px 24px", backgroundColor: "#f8fafc" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>Frequently Asked</h2>
            <p style={{ fontSize: "15px", color: "#64748b", margin: 0 }}>Honest answers about what PakkaScan does and doesn&apos;t do.</p>
          </div>
          <div>
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} defaultOpen={i === 0} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "32px", padding: "24px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
            <div style={{ fontSize: "14px", color: "#475569", marginBottom: "12px" }}>Have another question?</div>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", backgroundColor: "#25D366", color: "#ffffff", fontWeight: 700, fontSize: "14px", borderRadius: "10px", textDecoration: "none" }}>
              Message us on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ backgroundColor: "#0b132b", color: "#ffffff", padding: "64px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 className={fraunces.className} style={{ fontSize: "34px", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 16px 0" }}>
            Verify before you trust.
          </h2>
          <p style={{ fontSize: "16px", color: "#cbd5e1", lineHeight: 1.6, marginBottom: "32px" }}>
            Get an honest, bilingual second opinion before you hand over any money.
          </p>
          <a href="/scan" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "18px 40px", backgroundColor: "#16a34a", color: "#ffffff", fontWeight: 700, fontSize: "17px", borderRadius: "12px", textDecoration: "none", boxShadow: "0 4px 20px rgba(22,163,74,0.4)" }}>
            Scan Your First Document
          </a>
        </div>
      </section>

      <Footer />
      <WhatsAppFAB />
    </div>
  );
}


