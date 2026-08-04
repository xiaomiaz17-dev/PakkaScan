"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MarketingShell } from "@/components/SiteChrome";

/** Demo verifier — accepts known sample hashes only; no fabricated live registry. */
const DEMO_HASHES: Record<string, { verificationId: string; score: number; status: string }> = {
  "0x8f3a9c1e2b7d4f60a1c5e8d2b9f4a7c3e6d1b8a5f2c9e4d7b0a3f6c1e8d5b2": {
    verificationId: "VR-2026-DEMO01",
    score: 82,
    status: "Sample report — synthetic data only",
  },
  "vr-2026-demo01": {
    verificationId: "VR-2026-DEMO01",
    score: 82,
    status: "Sample report — synthetic data only",
  },
};

export default function VerifyPage() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");

  const result = useMemo(() => {
    const key = submitted.trim().toLowerCase();
    if (!key) return null;
    const found = DEMO_HASHES[key] ?? DEMO_HASHES[submitted.trim()];
    if (found) return { ok: true as const, ...found };
    return { ok: false as const };
  }, [submitted]);

  return (
    <MarketingShell>
      <div className="shell prose">
        <p>
          <Link href="/">← Home</Link>
        </p>
        <h1>Verify a report hash</h1>
        <p className="muted">
          Enter a PakkaScan verification ID or evidence hash shared with you. This public lookup proves authenticity
          without re-uploading documents.
        </p>
        <form
          className="stack"
          style={{ maxWidth: 520 }}
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(input);
          }}
        >
          <label htmlFor="hash">
            Verification hash / ID
            <input
              id="hash"
              name="hash"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. VR-2026-DEMO01 or 0x8f3a…"
              autoComplete="off"
              spellCheck={false}
              className="mono-input"
            />
          </label>
          <button className="primary" type="submit">
            Verify
          </button>
        </form>
        {result?.ok === true ? (
          <section className="panel" style={{ marginTop: 16 }}>
            <p>
              <span className="badge-ok">Recognised</span>
            </p>
            <p>
              <strong>Verification ID:</strong> <span className="mono-badge">{result.verificationId}</span>
            </p>
            <p>
              <strong>PakkaScore:</strong> {result.score}
            </p>
            <p className="muted">{result.status}</p>
          </section>
        ) : null}
        {result?.ok === false ? (
          <section className="banner failed" role="alert" style={{ marginTop: 16 }}>
            No public record for that value in this demo environment. Live verification requires the production evidence
            store (NOT_EXECUTED until deployed).
          </section>
        ) : null}
        <p className="muted small">
          Try demo value <span className="mono-badge">VR-2026-DEMO01</span>
        </p>
      </div>
    </MarketingShell>
  );
}
