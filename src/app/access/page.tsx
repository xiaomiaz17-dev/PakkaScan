"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Fraunces } from "next/font/google";
import { useSearchParams, useRouter } from "next/navigation";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

function AccessForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnTo = searchParams.get("returnTo") || "/app/scan";

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      if (res.ok) {
        router.push(returnTo);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Access denied. Please check your code and try again.");
        setPassword("");
      }
    } catch {
      setError("Could not verify access. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0b132b",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
    }}>
      {/* Logo */}
      <div style={{
        width: "72px",
        height: "72px",
        borderRadius: "50%",
        backgroundColor: "#0b132b",
        border: "3px solid #ffffff",
        boxShadow: "0 0 0 4px rgba(255,255,255,0.15), inset 0 0 12px rgba(255,255,255,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "20px",
      }}>
        <svg width="36" height="36" style={{ color: "#ffffff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>

      <div className={fraunces.className} style={{
        fontSize: "36px",
        fontWeight: 900,
        letterSpacing: "-0.02em",
        color: "#ffffff",
        marginBottom: "8px",
      }}>
        Pakka<span style={{ color: "#16a34a", fontStyle: "italic" }}>Scan</span>
      </div>

      <div style={{
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.2em",
        color: "#94a3b8",
        textTransform: "uppercase",
        marginBottom: "40px",
      }}>
        Private Beta &middot; Invite Only
      </div>

      {/* Card */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "16px",
        padding: "32px 28px",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.4)",
      }}>
        <h1 style={{
          fontSize: "22px",
          fontWeight: 800,
          color: "#0f172a",
          margin: "0 0 8px 0",
        }}>Enter access code</h1>
        <p style={{
          fontSize: "14px",
          color: "#64748b",
          margin: "0 0 24px 0",
          lineHeight: 1.5,
        }}>
          PakkaScan is in private beta. Enter the access code we shared with you to continue.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            autoComplete="off"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Access code"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: "15px",
              border: "1px solid " + (error ? "#fca5a5" : "#cbd5e1"),
              borderRadius: "10px",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: error ? "8px" : "16px",
              fontFamily: "monospace",
            }}
          />

          {error && (
            <div style={{
              fontSize: "12px",
              color: "#991b1b",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "8px 12px",
              marginBottom: "16px",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password.trim()}
            style={{
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "#0b132b",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "15px",
              border: "none",
              borderRadius: "10px",
              cursor: submitting || !password.trim() ? "not-allowed" : "pointer",
              opacity: submitting || !password.trim() ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {submitting ? "Verifying..." : "Continue"}
          </button>
        </form>

        <div style={{
          fontSize: "12px",
          color: "#94a3b8",
          textAlign: "center",
          marginTop: "24px",
          lineHeight: 1.5,
        }}>
          Don&apos;t have an access code?
          <br />
          <a href="mailto:hello@pakkascan.com" style={{ color: "#0b132b", fontWeight: 600, textDecoration: "underline" }}>
            Contact us for access
          </a>
        </div>
      </div>

      <div style={{
        fontSize: "11px",
        color: "#64748b",
        marginTop: "40px",
        textAlign: "center",
      }}>
        Coming soon: public launch with per-user accounts and payment.
      </div>
    </div>
  );
}

export default function AccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#0b132b" }} />}>
      <AccessForm />
    </Suspense>
  );
}
