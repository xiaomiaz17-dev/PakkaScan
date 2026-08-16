"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MarketingShell } from "@/components/SiteChrome";

/** Demo verifier - accepts known sample hashes only; no fabricated live registry. */
const DEMO_HASHES: Record<string, { verificationId: string; score: number; status: string }> = {
  "0x8f3a9c1e2b7d4f60a1c5e8d2b9f4a7c3e6d1b8a5f2c9e4d7b0a3f6c1e8d5b2": {
    verificationId: "VR-2026-DEMO01",
    score: 82,
    status: "Sample report - synthetic data only",
  },
  "vr-2026-demo01": {
    verificationId: "VR-2026-DEMO01",
    score: 82,
    status: "Sample report - synthetic data only",
  },
};

// Live PakkaScan reference codes: PKS-YYYY-MM-XXXX(...)
const PKS_PATTERN = /^PKS-\d{4}-\d{2}-[A-Z0-9]{4,}$/i;

export default function VerifyPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");

  const result = useMemo(() => {
    const key = submitted.trim().toLowerCase();
    if (!key) return null;
    const found = DEMO_HASHES[key] ?? DEMO_HASHES[submitted.trim()];
    if (found) return { ok: true as const, ...found };
    return { ok: false as const };
  }, [submitted]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    // Live PakkaScan reference -> navigate to dynamic result page
    if (PKS_PATTERN.test(trimmed)) {
      router.push(`/verify/${encodeURIComponent(trimmed.toUpperCase())}`);
      return;
    }

    // Otherwise fall through to demo-hash lookup
    setSubmitted(trimmed);
  };

  return (
    <MarketingShell>
      <div className="shell prose">
        <p>
          <Link href="/">&larr; Home</Link>
        </p>
        <h1>Verify a report</h1>
        <p className="muted">
          Enter a PakkaScan reference code or demo verification hash. This public lookup
          confirms a report was issued by PakkaScan without revealing document contents.
        </p>
        <form
          className="stack"
          style={{ maxWidth: 520 }}
          onSubmit={handleSubmit}
        >
          <label htmlFor="hash">
            Reference code / verification hash
            <input
              id="hash"
              name="hash"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. PKS-2026-08-XXXX or VR-2026-DEMO01"
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
            No public record for that value. If you have a PakkaScan reference code
            (format <span className="mono-badge">PKS-YYYY-MM-XXXX</span>), enter it above
            to check the live registry.
          </section>
        ) : null}
        <p className="muted small">
          Reference codes appear on every PakkaScan report.
          Try demo value <span className="mono-badge">VR-2026-DEMO01</span> to see the sample response.
        </p>
      </div>
    </MarketingShell>
  );
}