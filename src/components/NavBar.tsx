"use client";

import React, { useState } from "react";
import { Fraunces } from "next/font/google";
import Link from "next/link";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

export default function NavBar({ currentPage }: { currentPage?: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: "/#how-it-works", label: "How it Works" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      <style>{`
        .pks-nav-desktop { display: flex; align-items: center; gap: 24px; }
        .pks-nav-hamburger { display: none; background: none; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #ffffff; padding: 6px 12px; font-size: 20px; cursor: pointer; line-height: 1; }
        .pks-nav-mobile { display: none; padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.1); background-color: #0b132b; }
        @media (max-width: 768px) {
          .pks-nav-desktop { display: none !important; }
          .pks-nav-hamburger { display: inline-block !important; }
          .pks-nav-mobile-open { display: block !important; }
        }
      `}</style>
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

          <button className="pks-nav-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            {mobileMenuOpen ? "X" : "="}
          </button>

          <nav className="pks-nav-desktop">
            {links.map((link, i) => (
              <Link key={i} href={link.href} style={{ color: currentPage === link.label ? "#ffffff" : "#cbd5e1", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>{link.label}</Link>
            ))}
            <Link href="/scan" style={{ display: "inline-flex", alignItems: "center", padding: "8px 18px", backgroundColor: "#16a34a", color: "#ffffff", borderRadius: "8px", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>Try It</Link>
          </nav>
        </div>

        {mobileMenuOpen && (
          <div className="pks-nav-mobile pks-nav-mobile-open">
            {links.map((link, i) => (
              <Link key={i} href={link.href} onClick={() => setMobileMenuOpen(false)} style={{ display: "block", padding: "10px 0", color: "#cbd5e1", fontSize: "15px", fontWeight: 600, textDecoration: "none" }}>{link.label}</Link>
            ))}
            <Link href="/scan" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", marginTop: "12px", padding: "12px", backgroundColor: "#16a34a", color: "#ffffff", borderRadius: "8px", fontSize: "14px", fontWeight: 700, textDecoration: "none", textAlign: "center" }}>Try It</Link>
          </div>
        )}
      </div>
    </>
  );
}
