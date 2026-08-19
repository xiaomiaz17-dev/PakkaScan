"use client";

import React from "react";

const WHATSAPP_SHARE_URL = "https://wa.me/?text=";

type Verdict = string | null | undefined;

type Props = {
  variant: "results" | "verify";
  referenceCode: string;
  verifyUrl: string;
  verdict?: Verdict;
  pakkaScore?: number | null;
  fullWidth?: boolean;
};

function verdictLabel(v: Verdict): string {
  if (!v) return "Report ready";
  const map: Record<string, string> = {
    PROCEED: "Safe to Proceed",
    PROCEED_WITH_CAUTION: "Proceed with Caution",
    LEGAL_REVIEW_REQUIRED: "Legal Review Required",
    DO_NOT_PROCEED: "Do Not Proceed",
    STOP: "Do Not Proceed",
    BLOCKED: "Do Not Proceed",
    REJECT: "Do Not Proceed",
    INCONCLUSIVE: "Inconclusive",
  };
  return map[v] ?? v;
}

function buildMessage(props: Props): string {
  if (props.variant === "results") {
    const lines = ["I just verified my property documents with PakkaScan.", ""];
    lines.push("Verdict: " + verdictLabel(props.verdict));
    if (typeof props.pakkaScore === "number") {
      lines.push("PakkaScore: " + Math.round(props.pakkaScore) + "/100");
    }
    lines.push("Reference: " + props.referenceCode, "");
    lines.push("View the full report: " + props.verifyUrl);
    return lines.join("\n");
  }
  // variant === "verify"
  const lines = [
    "Verify this PakkaScan property report:",
    "",
    "Reference: " + props.referenceCode,
    props.verifyUrl,
  ];
  return lines.join("\n");
}

/**
 * WhatsApp share button.
 * Opens WhatsApp with a pre-filled message. User picks recipient.
 * Works on mobile (opens WhatsApp app) and desktop (opens WhatsApp Web).
 */
export default function WhatsAppShareButton(props: Props) {
  const message = buildMessage(props);
  const href = WHATSAPP_SHARE_URL + encodeURIComponent(message);

  const label = props.variant === "results" ? "Share my report on WhatsApp" : "Share this verification on WhatsApp";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "10px 18px",
        backgroundColor: "#25D366",
        color: "#ffffff",
        borderRadius: "10px",
        textDecoration: "none",
        fontWeight: 700,
        fontSize: "13px",
        border: "1px solid #1DA851",
        boxShadow: "0 2px 6px rgba(37, 211, 102, 0.25)",
        cursor: "pointer",
        width: props.fullWidth ? "100%" : "auto",
        boxSizing: "border-box",
        transition: "transform 0.1s ease, box-shadow 0.15s ease",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
      </svg>
      <span>{label}</span>
    </a>
  );
}