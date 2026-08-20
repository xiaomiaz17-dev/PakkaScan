"use client";

/**
 * Ownership Timeline UI — Chain of Title Session 6
 *
 * Horizontal on desktop, vertical on mobile.
 * Color-coded nodes: green = verified, yellow = warning, red = critical.
 * Full DD tier only; Bayana tier sees upgrade teaser.
 */

import React, { useState } from "react";
import type { ChainOfTitleResult, OwnershipEvent } from "@/intelligence/chain-of-title";

type Props = {
  result: ChainOfTitleResult;
  tier?: string;
  /** When true, show upgrade teaser instead of full timeline */
  teaserOnly?: boolean;
};

const EVENT_LABELS: Record<string, string> = {
  SALE: "Sale Deed",
  MUTATION: "Mutation",
  GIFT: "Gift",
  INHERITANCE: "Inheritance",
  MORTGAGE: "Mortgage",
  OWNERSHIP_RECORD: "Fard / Ownership",
  AGREEMENT: "Bayana / Agreement",
  OTHER: "Document",
};

function nodeColor(event: OwnershipEvent, result: ChainOfTitleResult): {
  bg: string;
  border: string;
  text: string;
} {
  const id = event.documentId;
  const hasCritical =
    result.gaps.some((g) => g.severity === "CRITICAL" && g.relatedDocumentIds.includes(id)) ||
    result.conflicts.some((c) => c.severity === "CRITICAL" && c.relatedDocumentIds.includes(id));
  const hasWarn =
    result.gaps.some((g) => g.relatedDocumentIds.includes(id)) ||
    result.conflicts.some((c) => c.relatedDocumentIds.includes(id));

  if (hasCritical) return { bg: "#fef2f2", border: "#fca5a5", text: "#7f1d1d" };
  if (hasWarn) return { bg: "#fffbeb", border: "#fcd34d", text: "#78350f" };
  if (event.verified) return { bg: "#ecfdf5", border: "#6ee7b7", text: "#065f46" };
  return { bg: "#f8fafc", border: "#cbd5e1", text: "#334155" };
}

export default function OwnershipTimeline({ result, tier, teaserOnly }: Props) {
  const [selected, setSelected] = useState<OwnershipEvent | null>(null);

  const isFullDd =
    tier === "FULL_DD" ||
    tier === "full_dd" ||
    tier === "FULL_PROPERTY_DUE_DILIGENCE" ||
    (tier || "").toLowerCase().includes("full");

  if (teaserOnly || !isFullDd) {
    return (
      <div
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          background: "linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
          Ownership Timeline
        </div>
        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 12 }}>
          Trace this property&apos;s ownership history across Sale Deeds, Mutations, and Fard —
          available on Full Property Due Diligence.
        </div>
        <a
          href="/pricing"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            backgroundColor: "#0d9488",
            color: "#fff",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Upgrade to Full DD
        </a>
      </div>
    );
  }

  if (!result.timeline.length) {
    return (
      <div style={{ marginTop: 20, padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>
          Ownership timeline — not enough transfer documents in this scan to build a chain.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24, marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748b", marginBottom: 12, textTransform: "uppercase" }}>
        Ownership Timeline
        {result.isComplete ? (
          <span style={{ marginLeft: 8, color: "#16a34a", fontWeight: 700 }}>· Chain looks complete</span>
        ) : (
          <span style={{ marginLeft: 8, color: "#ca8a04", fontWeight: 700 }}>· Gaps or conflicts detected</span>
        )}
      </div>

      {/* Timeline track */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 0,
          overflowX: "auto",
          paddingBottom: 12,
          WebkitOverflowScrolling: "touch",
        }}
        className="ownership-timeline-track"
      >
        {result.timeline.map((event, idx) => {
          const c = nodeColor(event, result);
          const isSelected = selected?.documentId === event.documentId;
          return (
            <div key={event.documentId + idx} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setSelected(isSelected ? null : event)}
                style={{
                  minWidth: 140,
                  maxWidth: 180,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `2px solid ${isSelected ? "#0d9488" : c.border}`,
                  backgroundColor: c.bg,
                  color: c.text,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: isSelected ? "0 0 0 3px rgba(13,148,136,0.2)" : "none",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.75, marginBottom: 4 }}>
                  {EVENT_LABELS[event.eventType] || event.eventType}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {event.date || "Date unknown"}
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.35 }}>
                  {event.transferee?.canonicalName || event.transferor?.canonicalName || "—"}
                </div>
              </button>
              {idx < result.timeline.length - 1 && (
                <div
                  style={{
                    width: 28,
                    height: 2,
                    backgroundColor: "#cbd5e1",
                    flexShrink: 0,
                    margin: "0 4px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            backgroundColor: "#fff",
            fontSize: 13,
            color: "#334155",
          }}
        >
          <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
            {EVENT_LABELS[selected.eventType]} · {selected.date || "Undated"}
          </div>
          {selected.fileName && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: "#64748b" }}>File: </span>
              {selected.fileName}
            </div>
          )}
          {selected.transferor && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: "#64748b" }}>From: </span>
              {selected.transferor.canonicalName}
              {selected.transferor.cnic ? ` (${selected.transferor.cnic.replace(/(\d{5})(\d{7})(\d)/, "$1-$2-$3")})` : ""}
            </div>
          )}
          {selected.transferee && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: "#64748b" }}>To: </span>
              {selected.transferee.canonicalName}
              {selected.transferee.cnic ? ` (${selected.transferee.cnic.replace(/(\d{5})(\d{7})(\d)/, "$1-$2-$3")})` : ""}
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
            {selected.verified ? "Parties resolved from document fields" : "Limited party data on this document"}
          </div>
        </div>
      )}

      {/* Gaps / conflicts summary */}
      {(result.gaps.length > 0 || result.conflicts.length > 0) && (
        <div style={{ marginTop: 14 }}>
          {result.gaps.map((g, i) => (
            <div
              key={"g" + i}
              style={{
                fontSize: 12,
                padding: "8px 12px",
                marginBottom: 6,
                borderRadius: 8,
                backgroundColor: g.severity === "CRITICAL" ? "#fef2f2" : "#fffbeb",
                color: g.severity === "CRITICAL" ? "#7f1d1d" : "#78350f",
                border: `1px solid ${g.severity === "CRITICAL" ? "#fecaca" : "#fde68a"}`,
              }}
            >
              <strong>{g.severity}</strong> — {g.message}
            </div>
          ))}
          {result.conflicts.map((c, i) => (
            <div
              key={"c" + i}
              style={{
                fontSize: 12,
                padding: "8px 12px",
                marginBottom: 6,
                borderRadius: 8,
                backgroundColor: c.severity === "CRITICAL" ? "#fef2f2" : "#fffbeb",
                color: c.severity === "CRITICAL" ? "#7f1d1d" : "#78350f",
                border: `1px solid ${c.severity === "CRITICAL" ? "#fecaca" : "#fde68a"}`,
              }}
            >
              <strong>{c.severity}</strong> — {c.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
