"use client";

import { useState } from "react";

export function PdfHashVerifier({
  referenceCode,
  hasPdfHash,
}: {
  referenceCode: string;
  hasPdfHash?: boolean;
}) {
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<{ match?: boolean; message?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(referenceCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfHash: hash.trim() }),
      });
      setResult(await res.json());
    } catch {
      setResult({ match: false, message: "Could not verify hash. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 20, padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>
        Verify PDF authenticity
      </div>
      <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px", lineHeight: 1.5 }}>
        {hasPdfHash
          ? "Paste the SHA-256 hash of a PakkaScan PDF Passport to confirm it matches the original issued for this reference."
          : "No PDF has been downloaded for this reference yet. Generate the PDF Passport from the scan results page first."}
      </p>
      <input type="text" value={hash} onChange={(e) => setHash(e.target.value)}
        placeholder="SHA-256 hash (64 hex characters)" disabled={!hasPdfHash}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box", marginBottom: 8 }}
      />
      <button type="button" onClick={check} disabled={busy || !hasPdfHash || hash.trim().length < 32}
        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#0d9488", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !hasPdfHash ? 0.5 : 1 }}>
        {busy ? "Checking…" : "Verify hash"}
      </button>
      {result && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: result.match ? "#ecfdf5" : "#fef2f2", border: `1px solid ${result.match ? "#a7f3d0" : "#fecaca"}`, color: result.match ? "#065f46" : "#991b1b", fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
          {result.message || (result.match ? "Match" : "No match")}
        </div>
      )}
    </div>
  );
}
