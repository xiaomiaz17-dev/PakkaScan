"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketingShell } from "@/components/SiteChrome";

const FULL_HASH = "0x8f3a9c1e2b7d4f60a1c5e8d2b9f4a7c3e6d1b8a5f2c9e4d7b0a3f6c1e8d5b2";
const SHORT_HASH = "0x8f3a…d5b2";

export default function SampleReportPage() {
  const [anon, setAnon] = useState(true);
  const [copied, setCopied] = useState(false);
  const [annotated, setAnnotated] = useState(true);

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(`https://pakkascan.com/verify?h=${FULL_HASH}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function downloadSample() {
    const body = [
      "PakkaScan — Sample Audit Report (DEMO ONLY)",
      "Verification ID: VR-2026-DEMO01",
      `Evidence hash: ${FULL_HASH}`,
      "PakkaScore: 82",
      "Decision-support only — not legal advice.",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "pakkascan-sample-audit-demo.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <MarketingShell>
      <div className="shell">
        <p>
          <Link href="/">← Home</Link>
        </p>
        <span className="badge">Demo · not a real title</span>
        <h1>Sample audit report</h1>
        <p className="muted">
          Synthetic content only. Side-by-side view shows how raw document cues become evidence-linked findings.
        </p>

        <label className="anon-toggle">
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
          <span>
            Automatically redact CNIC &amp; personal identifiers in preview
            <span className="muted small" style={{ display: "block", fontWeight: 500 }}>
              Privacy-first default for demos.
            </span>
          </span>
        </label>

        <label className="anon-toggle" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={annotated} onChange={(e) => setAnnotated(e.target.checked)} />
          <span>View annotated document (before → after extraction)</span>
        </label>

        {annotated ? (
          <div className="before-after" aria-label="Before and after extraction">
            <article className="card">
              <small className="muted">BEFORE · raw scan cues</small>
              <div className="raw-scan">
                <div className="raw-line">FARD-E-MALKIYAT (scan)</div>
                <div className="raw-line dim">Khasra …… 412/9</div>
                <div className="raw-line dim">Owner …… {anon ? "••••••••" : "Muhammad …"}</div>
                <div className="raw-line dim">Deed ref …… SR-…</div>
              </div>
            </article>
            <article className="card">
              <small className="muted">AFTER · parsed findings</small>
              <ul className="parsed-list">
                <li>
                  Khasra <span className="mono-badge">412/9</span> <span className="status-pill pass">Extracted</span>
                </li>
                <li>
                  Owner match {anon ? "••••" : "within tolerance"} <span className="status-pill pass">Matched</span>
                </li>
                <li>
                  Active charge <span className="status-pill warn">Gap detected</span>
                </li>
              </ul>
            </article>
          </div>
        ) : null}

        <div className="grid" style={{ marginTop: 20 }}>
          <article className="card">
            <small className="muted">PakkaScore</small>
            <h2 style={{ fontFamily: "var(--font-mono)", color: "var(--success)" }}>82</h2>
          </article>
          <article className="card">
            <small className="muted">Verification hash</small>
            <div className="hash-row">
              <span className="mono-badge">{SHORT_HASH}</span>
              <button type="button" className="button secondary" onClick={() => void copyHash()}>
                {copied ? "Copied link" : "Copy audit link"}
              </button>
              <Link className="button secondary" href="/verify">
                Open verifier
              </Link>
            </div>
          </article>
          <article className="card">
            <small className="muted">Status</small>
            <p>
              <span className="status-pill ready">Report ready</span>
            </p>
          </article>
        </div>

        <section className="panel" style={{ marginTop: 16 }}>
          <h2>Findings</h2>
          <ul>
            <li>
              <strong>Mutation continuity</strong> — continuous. <span className="status-pill pass">Verified</span>{" "}
              <span className="mono-badge">ev_mut_01</span>
            </li>
            <li>
              <strong>Owner name match</strong> —{" "}
              {anon ? "Demo Customer ↔ CNIC •••••-•••••••-•" : "Demo Customer ↔ CNIC 12345-1234567-1"}.{" "}
              <span className="status-pill pass">Matched</span>
            </li>
            <li>
              <strong>Active charge observation</strong> — clearance needed.{" "}
              <span className="status-pill warn">Gap detected</span>
            </li>
          </ul>
          <p className="muted small">Decision-support only — not legal advice.</p>
          <div className="form-actions">
            <Link className="button primary" href="/register">
              Scan your property document →
            </Link>
            <button type="button" className="button secondary" onClick={downloadSample}>
              Download sample audit
            </button>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
