"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

const TIERS = [
  { value: "rental", label: "Rental Safety Check (Rs 499)" },
  { value: "bayana", label: "Bayana Safety Check (Rs 1499)" },
  { value: "full_dd", label: "Full Property Due Diligence (Rs 2999)" },
] as const;

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 15,
  boxSizing: "border-box",
};

export default function AdminUnlockPage() {
  const [secret, setSecret] = useState("");
  const [email, setEmail] = useState("");
  const [reportType, setReportType] = useState("bayana");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    ok?: boolean;
    error?: string;
    message?: string;
  } | null>(null);

  async function unlock() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/grant-entitlement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-grant-secret": secret.trim(),
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          reportType,
          note: note.trim() || "ops-unlock-ui",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let message = "Unlock failed.";
        if (data.error === "user_not_found") {
          message = "Customer must Sign in once with this email first.";
        } else if (data.error === "unauthorized") {
          message = "Wrong ops secret.";
        } else if (data.message) {
          message = data.message;
        }
        setResult({ ok: false, error: data.error || "error", message });
      } else {
        setResult({
          ok: true,
          message: "Unlocked " + reportType + " for " + email.trim().toLowerCase(),
        });
      }
    } catch (e: unknown) {
      setResult({
        ok: false,
        error: "network",
        message: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 440,
        margin: "40px auto",
        padding: "24px 20px",
        fontFamily: "system-ui, sans-serif",
        color: "#0f172a",
      }}
    >
      <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px" }}>
        Internal only — do not share publicly
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Unlock a scan</h1>
      <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px", lineHeight: 1.5 }}>
        After JazzCash confirms: email + tier + Unlock.
      </p>

      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
        Ops secret
      </label>
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        autoComplete="off"
        style={inputStyle}
      />

      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: "#64748b",
          marginBottom: 4,
          marginTop: 14,
        }}
      >
        Customer login email
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="customer@gmail.com"
        style={inputStyle}
      />

      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: "#64748b",
          marginBottom: 4,
          marginTop: 14,
        }}
      >
        Tier
      </label>
      <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={inputStyle}>
        {TIERS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: "#64748b",
          marginBottom: 4,
          marginTop: 14,
        }}
      >
        Note / pay ref (optional)
      </label>
      <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />

      <button
        type="button"
        disabled={busy || !secret.trim() || !email.includes("@")}
        onClick={() => void unlock()}
        style={{
          width: "100%",
          marginTop: 20,
          padding: "14px 16px",
          borderRadius: 10,
          border: "none",
          background: busy ? "#94a3b8" : "#0f766e",
          color: "#fff",
          fontWeight: 800,
          fontSize: 15,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Unlocking..." : "Confirm payment and unlock"}
      </button>

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 10,
            background: result.ok ? "#ecfdf5" : "#fef2f2",
            border: "1px solid " + (result.ok ? "#a7f3d0" : "#fecaca"),
            color: result.ok ? "#065f46" : "#991b1b",
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          <strong>{result.ok ? "Done" : "Failed"}</strong>
          <div style={{ marginTop: 6 }}>{result.message}</div>
          {result.ok && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              Tell customer: https://www.pakkascan.com/scan
            </div>
          )}
        </div>
      )}
    </main>
  );
}