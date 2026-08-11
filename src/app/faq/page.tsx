"use client";

import React, { useState } from "react";
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

const FAQ_SECTIONS = [
  {
    title: "General",
    items: [
      {
        q: "What is PakkaScan?",
        a: "PakkaScan is an AI-powered document analyser built for Pakistani property transactions. Upload a Bayana, Fard, Sale Deed, CNIC, or any related document, and PakkaScan reads every clause in English and Urdu, cross-checks the details, and gives you a clear verdict in about two minutes.",
      },
      {
        q: "Who is PakkaScan for?",
        a: "Anyone about to sign a rental, hand over token money for a plot, or complete a property purchase in Pakistan. First-time buyers, overseas Pakistanis buying remotely, and anyone who wants a fast, independent second opinion before spending significant money.",
      },
      {
        q: "How is it different from just asking my lawyer?",
        a: "PakkaScan complements a lawyer, not replaces one. Lawyers charge PKR 15,000-50,000 and take 3-7 days for a title check. PakkaScan costs Rs 499-2,999 and takes 2 minutes. It's the first line of defence. For high-value transactions, use both: PakkaScan first (fast, cheap), lawyer second (thorough, authoritative).",
      },
    ],
  },
  {
    title: "How It Works",
    items: [
      {
        q: "What documents can PakkaScan read?",
        a: "Bayana / Agreement to Sell, Registered Sale Deed, Tenancy Agreements, CNIC / NICOP / POC, Fard (ownership record), Mutation (Sale / Gift / Mortgage / Inheritance), Power of Attorney, Gift Deed, Non-Encumbrance Certificate, and more. PakkaScan auto-detects the document type ? you don't need to sort first.",
      },
      {
        q: "What formats work best?",
        a: "PakkaScan works best on typed documents and clean photos taken with a phone. PDF, JPG, PNG, and HEIC all work. For handwritten documents, PakkaScan handles most modern (post-2000) records. Very old handwritten records (Shikastah script, faded ink) may not extract fully ? in that case, PakkaScan will tell you clearly rather than guess.",
      },
      {
        q: "What if PakkaScan can't read my document?",
        a: "If the OCR quality is too poor, PakkaScan tells you clearly and suggests you retake the photo in better lighting. If it's a document type we don't support well yet (like some older regional records), we say so upfront. Either way, you're not left staring at a broken screen.",
      },
    ],
  },
  {
    title: "Accuracy & Trust",
    items: [
      {
        q: "How accurate is the AI?",
        a: "PakkaScan uses layered verification: OCR reads the text, regex extracts structured fields, and an LLM validates everything against the source document with anti-hallucination checks. Fabricated CNICs are stripped. Ambiguous fields are flagged. If the AI is unsure, it says so rather than guess. Always check the 'Missing Evidence' section for anything not confirmed.",
      },
      {
        q: "What if PakkaScan says PROCEED and I still get scammed?",
        a: "PakkaScan is an advisory tool, not a guarantee. We verify what the documents SAY. We can't verify that they're not sophisticated forgeries, or that the seller you're dealing with is actually the person named. Always confirm high-value transactions in person, with a lawyer, and directly with authorities (Sub-Registrar, Patwari, NADRA). See our Terms of Service for full policy.",
      },
      {
        q: "Is PakkaScan a substitute for a lawyer?",
        a: "No. PakkaScan is an assistive tool ? not a licensed lawyer or certified legal counsel. For very high-value transactions, always confirm your paperwork with a qualified lawyer and directly with the relevant authority. PakkaScan helps you know when your papers look clean, and when you need a second opinion.",
      },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      {
        q: "What happens to my documents after scanning?",
        a: "Documents you upload are processed in memory only. Nothing is written to disk on our servers. Extracted text is cached in server memory for 24 hours to speed up re-scans of the same document, then automatically wiped. We never store your original PDF or image files.",
      },
      {
        q: "What data do you store?",
        a: "Your account email, the date of each scan you ran, the extracted structured data from that scan (party names, addresses, verdict), and your bilingual report. This is stored in a secure Postgres database. We do NOT store your original document files.",
      },
      {
        q: "Do you share my data?",
        a: "No. Your scan data is never shared with any third party, sold, or used for advertising. We use anonymised, aggregate patterns internally (e.g., 'most common document types uploaded') to improve the product. See our Privacy Policy for full details.",
      },
    ],
  },
  {
    title: "Pricing & Payment",
    items: [
      {
        q: "How much does it cost?",
        a: "Rs 499 for a Rental Safety Check, Rs 1,499 for a Bayana Safety Check, Rs 2,999 for a Full Property Due Diligence. Your first scan is free. No subscription ? pay per report.",
      },
      {
        q: "How do I pay?",
        a: "Easypaisa, JazzCash, HBL/MCB/UBL debit and credit cards, and direct bank transfer. Payment integration is launching shortly. During private beta, PakkaScan is completely free.",
      },
      {
        q: "Can I get a refund?",
        a: "If PakkaScan gave you clearly incorrect information ? fabricated a CNIC number, missed obvious red flags in a clear document, or crashed mid-scan ? message us on WhatsApp and we'll refund the scan and investigate. Refunds are handled case-by-case within 7 days.",
      },
    ],
  },
];

function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #e2e8f0" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "18px 4px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
        <span>{q}</span>
        <span style={{ fontSize: "20px", color: "#64748b", transform: open ? "rotate(45deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0, marginLeft: "12px" }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 4px 20px 4px", fontSize: "14px", color: "#475569", lineHeight: 1.7 }}>{a}</div>
      )}
    </div>
  );
}

export default function FaqPage() {
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
            <Link href="/contact" style={navLinkStyle}>Contact</Link>
            <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", padding: "8px 18px", backgroundColor: "#16a34a", color: "#ffffff", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>Try It</Link>
          </nav>
        </div>
      </div>

      <section style={{ backgroundColor: "#0b132b", color: "#ffffff", padding: "64px 24px 48px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "16px" }}>Frequently Asked</div>
          <h1 className={fraunces.className} style={{ fontSize: "44px", fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 20px 0", lineHeight: 1.2 }}>
            Questions &amp; <span style={{ color: "#16a34a", fontStyle: "italic" }}>Answers</span>
          </h1>
          <p style={{ fontSize: "17px", color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>Honest answers about what PakkaScan does and doesn&apos;t do.</p>
        </div>
      </section>

      <section style={{ padding: "48px 24px 64px 24px", backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {FAQ_SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "0 0 16px 0", paddingBottom: "12px", borderBottom: "2px solid #16a34a", display: "inline-block" }}>{section.title}</h2>
              <div>
                {section.items.map((item, i) => (
                  <FaqItem key={i} q={item.q} a={item.a} defaultOpen={si === 0 && i === 0} />
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginTop: "40px", padding: "24px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>Didn&apos;t find your answer?</div>
            <div style={{ fontSize: "13px", color: "#475569", marginBottom: "16px" }}>Message us on WhatsApp ? a real person will reply.</div>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", backgroundColor: "#25D366", color: "#ffffff", fontWeight: 700, fontSize: "14px", borderRadius: "10px", textDecoration: "none" }}>
              Message us on WhatsApp
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
