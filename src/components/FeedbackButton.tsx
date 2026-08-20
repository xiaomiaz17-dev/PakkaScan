"use client";

import { useState } from "react";

export function FeedbackButton({
  referenceCode,
  page = "scan_results",
}: {
  referenceCode?: string | null;
  page?: string;
}) {
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(helpful: boolean) {
    setChoice(helpful ? "yes" : "no");
    setBusy(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helpful,
          comment: comment.trim() || null,
          referenceCode: referenceCode || null,
          page,
        }),
      });
      setSent(true);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", fontSize: 13, color: "#065f46", fontWeight: 600 }}>
        Thanks — your feedback helps improve PakkaScan.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20, padding: "16px 18px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
        Was this report helpful?
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" disabled={busy} onClick={() => submit(true)}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #86efac", background: choice === "yes" ? "#dcfce7" : "#fff", color: "#166534", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Yes
        </button>
        <button type="button" disabled={busy} onClick={() => submit(false)}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca", background: choice === "no" ? "#fef2f2" : "#fff", color: "#991b1b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          No
        </button>
      </div>
      <input type="text" value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder={choice === "no" ? "What could be better? (optional)" : "What was most useful? (optional)"}
        maxLength={500}
        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}
      />
    </div>
  );
}
