"use client";

import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { useState } from "react";
import { FOOTER_COLUMNS, NAV, SITE } from "@/content/site";

export function SiteHeader({ ctaHref = "/register", ctaLabel = "Upload or scan" }: { ctaHref?: string; ctaLabel?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
          <BrandMark size={28} />
          <span>{SITE.name}</span>
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
        <nav id="primary-nav" className={`nav ${open ? "open" : ""}`} aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link className="button power" href={ctaHref} onClick={() => setOpen(false)}>
            {ctaLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Footer">
      <div className="footer-grid">
        <div>
          <strong className="brand"><BrandMark size={22} /> <span>{SITE.name}</span></strong>
          <p className="muted">{SITE.tagline}</p>
          <p className="muted small">Evidence-first property intelligence for Pakistan.</p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="footer-heading">{col.title}</h2>
            <ul className="footer-list">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="footer-legal muted small">
        © {new Date().getFullYear()} {SITE.name}. Not a substitute for independent legal advice.
      </p>
    </footer>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
