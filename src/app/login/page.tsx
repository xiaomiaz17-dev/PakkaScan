"use client";

import React, { useState, Suspense } from "react";
import { Fraunces } from "next/font/google";
import { useSearchParams } from "next/navigation";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

function LoginForm() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const errorMessage = (() => {
    if (!errorCode) return null;
    if (errorCode === "invalid_link") return "That sign-in link is invalid.";
    if (errorCode === "link_used") return "That sign-in link was already used. Please request a new one.";
    if (errorCode === "link_expired") return "That sign-in link has expired. Please request a new one.";
    return "Something went wrong. Please try again.";
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b132b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#0b132b", border: "3px solid #ffffff", boxShadow: "0 0 0 4px rgba(255,255,255,0.15), inset 0 0 12px rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
        <svg width="36" height="36" style={{ color: "#ffffff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div className={fraunces.className} style={{ fontSize: "36px", fontWeight: 900, letterSpacing: "-0.02em", color: "#ffffff", marginBottom: "8px" }}>
        Pakka<span style={{ color: "#16a34a", fontStyle: "italic" }}>Scan</span>
      </div>
      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "40px" }}>
        Sign in with your email
      </div>

      <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", padding: "32px 28px", width: "100%", maxWidth: "420px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.4)" }}>
        {sent ? (
          <>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0" }}>Check your email</h1>
            <p style={{ fontSize: "14px", color: "#475569", margin: "0 0 20px 0", lineHeight: 1.5 }}>
              We have sent a sign-in link to <strong>{email}</strong>. The link is valid for 15 minutes.
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0", lineHeight: 1.5 }}>
              Did not receive it? Check your spam folder, or{" "}
              <button onClick={() => { setSent(false); setEmail(""); }} style={{ background: "none", border: "none", color: "#0b132b", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: "13px", textDecoration: "underline" }}>
                try a different email.
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>Enter your email</h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px 0", lineHeight: 1.5 }}>
              We will email you a one-time sign-in link. No password needed.
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={submitting}
                style={{ width: "100%", padding: "12px 14px", fontSize: "15px", border: "1px solid " + (errorMessage ? "#fca5a5" : "#cbd5e1"), borderRadius: "10px", outline: "none", boxSizing: "border-box", marginBottom: errorMessage ? "8px" : "16px" }}
              />
              {errorMessage && (
                <div style={{ fontSize: "12px", color: "#991b1b", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 12px", marginBottom: "16px" }}>{errorMessage}</div>
              )}
              <button type="submit" disabled={submitting || !email.trim()} style={{ width: "100%", padding: "12px 16px", backgroundColor: "#0b132b", color: "#ffffff", fontWeight: 700, fontSize: "15px", border: "none", borderRadius: "10px", cursor: submitting || !email.trim() ? "not-allowed" : "pointer", opacity: submitting || !email.trim() ? 0.6 : 1 }}>
                {submitting ? "Sending link..." : "Email me a sign-in link"}
              </button>
            </form>
          </>
        )}
      </div>

      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "40px", textAlign: "center" }}>
        PakkaScan is in private beta.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#0b132b" }} />}>
      <LoginForm />
    </Suspense>
  );
}
