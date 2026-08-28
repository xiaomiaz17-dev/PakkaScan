"use client";
import { useEffect, useState } from "react";

export function VerifyHashPanel({ referenceCode }: { referenceCode: string }) {
  const [sha, setSha] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!referenceCode) return;
    fetch("/api/beta/report/hash?ref=" + encodeURIComponent(referenceCode))
      .then((r) => r.json())
      .then((j) => {
        if (j?.sha256) setSha(String(j.sha256));
        else setMissing(true);
      })
      .catch(() => setMissing(true));
  }, [referenceCode]);
  return (
    <div style={{ marginTop: 16, padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>PDF authenticity hash (SHA-256)</div>
      {sha ? (
        <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>{sha}</div>
      ) : (
        <div style={{ fontSize: 12, color: "#64748b" }}>
          {missing ? "No PDF has been generated for this ref yet." : "Looking up hash…"}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
        Download the PDF Passport, hash the file, and match this string.
      </div>
    </div>
  );
}