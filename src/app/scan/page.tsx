"use client";


import { RiskMeaningStrip } from "@/components/RiskMeaningStrip";
import { ValuationComparisonCard } from "@/components/ValuationComparisonCard";
import { FlaggedClausesPanel } from "@/components/FlaggedClausesPanel";
import { FeedbackButton } from "@/components/FeedbackButton";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Fraunces, Noto_Nastaliq_Urdu } from "next/font/google";
import { DOCUMENT_TYPE_OPTIONS, groupedDocumentTypes, type DocumentTypeOption } from "@/lib/document-types";
import { QRCodeSVG } from "qrcode.react";
import { getCnicDistrict } from "@/intelligence/cnic-districts";
import WhatsAppFAB from "@/components/WhatsAppFAB";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import OwnershipTimeline from "@/components/OwnershipTimeline";

type SessionUser = { email: string; name: string | null };

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
});

const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

const STAGES = [
  { icon: "IN", label: "Ingestion", subtext: "Receiving document..." },
  { icon: "OC", label: "OCR", subtext: "Reading English and Urdu text..." },
  { icon: "AI", label: "Intelligence", subtext: "PakkaScan analysing content..." },
  { icon: "PI", label: "PII Redaction", subtext: "Masking sensitive info..." },
  { icon: "RA", label: "Risk", subtext: "Checking legal compliance..." },
  { icon: "RP", label: "Report", subtext: "Generating verdict..." },
];

const MAIN_DOCS = ["Sale Deeds", "Bayana Agreements", "Mutation", "PoA"];
const ALL_SUPPORTED_DOCS = [...MAIN_DOCS, "Gift Deeds", "Lease Agreements", "Transfer Letters", "Fard / Ownership Extract", "Registry", "Will"];

// Human-friendly labels for internal document type enums.
// Falls back to a Title Case conversion if the type is not in the map.
const DOC_TYPE_LABELS: Record<string, string> = {
  TENANCY_AGREEMENT: "Tenancy Agreement",
  AGREEMENT_TO_SELL: "Bayana / Agreement to Sell",
  REGISTERED_SALE_DEED: "Registered Sale Deed",
  SALE_DEED_TEMPLATE: "Sale Deed (Draft/Template)",
  IDENTITY_CNIC: "CNIC (National Identity Card)",
  IDENTITY_NICOP: "NICOP (Overseas Pakistani ID)",
  IDENTITY_POC: "POC (Pakistan Origin Card)",
  FAMILY_REGISTRATION_CERTIFICATE: "Family Registration Certificate",
  FARD_CURRENT_OWNERSHIP: "Fard (Ownership Record)",
  FARD_SALE_PURPOSE: "Fard for Sale",
  FARD_COURT_SURETY: "Fard for Court Surety",
  MUTATION_SALE: "Mutation (Sale)",
  MUTATION_GIFT: "Mutation (Gift)",
  MUTATION_INHERITANCE: "Mutation (Inheritance)",
  MUTATION_MORTGAGE: "Mutation (Mortgage)",
  GIFT_DEED: "Gift Deed (Hiba-nama)",
  RELINQUISHMENT_DEED: "Relinquishment Deed",
  CANCELLATION_DEED: "Cancellation Deed",
  NON_ENCUMBRANCE_CERTIFICATE: "Non-Encumbrance Certificate",
  GENERAL_POWER_OF_ATTORNEY: "General Power of Attorney",
  AUTHORITY_TRANSFER_APPLICATION: "Authority Transfer Application",
  BUILDING_PLAN_APPROVAL: "Building Plan Approval",
  UNKNOWN: "Unrecognised Document",
};

function humanDocType(t?: string): string {
  if (!t) return "Unrecognised Document";
  if (DOC_TYPE_LABELS[t]) return DOC_TYPE_LABELS[t];
  return t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

type SmartFields = {
  parties?: any;
  financials?: any;
  property?: any;
  dates?: any;
  legal?: any;
  clauses?: any;
  summary?: string;
  extractionEngine?: string;
  extractionError?: string;
  _cnicValidation?: { verified: number; hallucinated: number; altered: number; droppedByLlm: number; summary: string };
};

type NextStep = { title: string; detail: string; priority: "high" | "medium" | "low" };

type CompletenessReport = {
  status: "complete" | "partial" | "template";
  criticalFieldsPresent: number;
  criticalFieldsTotal: number;
  missingFields: Array<{ fieldPath: string; label: string; category: "party" | "financial" | "date" | "property" | "other" }>;
  hasAnyClauses: boolean;
  hasAnyProperty: boolean;
  message: string;
};

type BackendDocument = {
  smartFields?: SmartFields;
  completeness?: CompletenessReport;
  documentId: string;
  fileName: string;
  status: string;
  ocr?: { engineUsed?: string; confidence?: number; language?: string; pageCount?: number; charCount?: number };
  classification?: { documentType?: string; jurisdiction?: string; confidence?: number; reasons?: string[] };
  extracted?: { fields?: Array<{ path: string; value: any; confidence?: number; field?: string }>; warnings?: string[] };
  observations?: any[];
  error?: string;
};

type CrossCheck = {
  category: "identity" | "ownership" | "property" | "financial" | "date" | "other";
  status: "match" | "mismatch" | "partial_match" | "unverifiable";
  finding: string;
  severity: "critical" | "warning" | "info";
};

type CrossDocResult = {
  crossChecks: CrossCheck[];
  overallAssessment: string;
  hasCriticalMismatch: boolean;
  error?: string;
  model?: string;
};

type CombinedVerdict = {
  verdict: string;
  posture: string;
  reasoning: string;
};

type BackendResponse = {
  success: boolean;
  tier?: "rental" | "bayana" | "full_dd" | null;
  documents: BackendDocument[];
  crossDoc?: CrossDocResult | null;
  combinedVerdict?: CombinedVerdict | null;
  referenceCode?: string | null;
  urduTranslations?: Record<string, string>;
  riskScore?: number;
  riskLabel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskFactors?: Array<{ label: string; points: number; category: string }>;
  valuationComparison?: any;
  clauseConcerns?: { flagged: any[]; missing: string[] };
  scoreBreakdown?: string;
  chainOfTitle?: any;
  phase2?: {
    result?: { decision?: string; pakkaScore?: number; findings?: any[]; blockers?: number };
    posture?: string;
    missingEvidence?: { missing?: any[]; coverage?: number };
    nextSteps?: NextStep[];
  };
  error?: string;
  details?: string;
};

const URDU_VERDICT_LABELS: Record<string, string> = {
  "PROCEED": "Ø¢Ú¯Û’ Ø¨Ú‘Ú¾ÛŒÚº",
  "PROCEED WITH CAUTION": "Ø§Ø­ØªÛŒØ§Ø· Ø³Û’ Ø¢Ú¯Û’ Ø¨Ú‘Ú¾ÛŒÚº",
  "DO NOT PROCEED": "Ø¢Ú¯Û’ Ù†Û Ø¨Ú‘Ú¾ÛŒÚº",
  "BLANK OR TEMPLATE": "Ø®Ø§Ù„ÛŒ ÛŒØ§ Ù†Ù…ÙˆÙ†Û",
  "INCOMPLETE DOCUMENT": "Ù†Ø§Ù…Ú©Ù…Ù„ Ø¯Ø³ØªØ§ÙˆÛŒØ²",
};

function urduLabelFor(englishLabel: string): string | null {
  return URDU_VERDICT_LABELS[englishLabel.toUpperCase()] || null;
}

function SmartFieldsPanel({ data, urduSummary }: { data: any; urduSummary?: string | null }) {
  const rows: Array<{ label: string; value: string; unverified?: boolean; note?: string }> = [];
  const p = data.parties || {};
  const f = data.financials || {};
  const pr = data.property || {};
  const d = data.dates || {};
  const fmtMoney = (m: any): string | null => {
    if (!m) return null;
    const amt = Number(m.amount);
    if (!isFinite(amt) || isNaN(amt) || amt <= 0) return null;
    return (m.currency || "PKR") + " " + amt.toLocaleString();
  };
  const pushMoney = (label: string, m: any) => {
    const v = fmtMoney(m);
    if (v) rows.push({ label, value: v });
  };

  const partyRow = (label: string, party: any) => {
    if (!party?.name) return;
    let value = party.name;
    if (party.cnic) {
      value += " (CNIC " + party.cnic + ")";
      // Enrich with district info if the CNIC prefix is in our verified lookup table
      const district = getCnicDistrict(party.cnic);
      if (district) {
        value += " [issued in " + district.district + ", " + district.province + "]";
      }
    }
    rows.push({
      label,
      value,
      unverified: Boolean(party.cnic_unverified),
      note: party.cnic_note,
    });
  };

  partyRow("Landlord", p.landlord);
  partyRow("Tenant", p.tenant);
  partyRow("Seller", p.seller);
  partyRow("Buyer", p.buyer);
  partyRow("Card Holder", p.holder);
  partyRow("Principal", p.principal);
  partyRow("Attorney", p.attorney);
  partyRow("Donor", p.donor);
  partyRow("Donee", p.donee);
  partyRow("Owner", p.owner);
  partyRow("Transferor", p.transferor);
  partyRow("Transferee", p.transferee);
  partyRow("Mortgagor", p.mortgagor);
  partyRow("Mortgagee", p.mortgagee);

  pushMoney("Monthly Rent", f.monthly_rent);
  pushMoney("Security Deposit", f.security_deposit);
  pushMoney("Advance", f.advance_rent);
  pushMoney("Advance", f.advance);
  pushMoney("Total Price", f.total_price);
  pushMoney("Token / Bayana", f.token_amount);
  pushMoney("Balance Due", f.balance_due);
  pushMoney("Stamp Duty", f.stamp_duty);
  pushMoney("Registration Fee", f.registration_fee);

  if (pr.address) rows.push({ label: "Property Address", value: pr.address });
  if (pr.type) rows.push({ label: "Property Type", value: pr.type });
  if (pr.area) rows.push({ label: "Area", value: pr.area });
  if (pr.plot_number) rows.push({ label: "Plot Number", value: pr.plot_number });

  const isValidDate = (v: any): boolean => {
    if (typeof v !== "string") return false;
    const s = v.trim();
    if (!s) return false;
    // Placeholder patterns to skip: 2026-00-00, YYYY-MM-DD, 0000-00-00, "unknown", "N/A"
    if (/^\d{4}-00-00$/.test(s)) return false;
    if (/^\d{4}-00-\d{2}$/.test(s)) return false;
    if (/^\d{4}-\d{2}-00$/.test(s)) return false;
    if (/^0000/.test(s)) return false;
    if (/YYYY|MM|DD/i.test(s)) return false;
    if (/^(unknown|n\/a|none|null)$/i.test(s)) return false;
    return true;
  };
  const pushDate = (label: string, v: any) => {
    if (isValidDate(v)) rows.push({ label, value: v });
  };
  pushDate("Start Date", d.start_date);
  pushDate("End Date", d.end_date);
  pushDate("Signed On", d.execution_date);
  pushDate("Registered On", d.registration_date);
  pushDate("Balance Due By", d.balance_due_date);
  if (d.duration_months && Number(d.duration_months) > 0) rows.push({ label: "Duration", value: d.duration_months + " months" });

  // Handle additional_cnics_found_in_document surfaced by validator
  const extraCnics = p.additional_cnics_found_in_document;
  if (Array.isArray(extraCnics) && extraCnics.length > 0) {
    for (const item of extraCnics) {
      rows.push({
        label: "Additional CNIC (unassigned)",
        value: item.cnic,
        unverified: true,
        note: item.note,
      });
    }
  }

  if (rows.length === 0) return null;

  return (
    <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", marginTop: "12px", marginBottom: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em" }}>Key Facts</span>
        <span style={{ fontSize: "9px", color: "#16a34a", fontWeight: 700 }}>AI-verified</span>
      </div>
      <div className="pks-facts-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ backgroundColor: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: r.unverified ? "1px solid #fed7aa" : "1px solid #dcfce7" }}>
            <div style={{ fontSize: "10px", color: r.unverified ? "#92400e" : "#166534", fontWeight: 700, marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              {r.label}
              {r.unverified && <span style={{ marginLeft: "6px", backgroundColor: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: "4px", fontSize: "9px" }}>UNVERIFIED</span>}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>{r.value}</div>
            {r.note && <div style={{ fontSize: "10px", color: "#92400e", marginTop: "4px", fontStyle: "italic" }}>{r.note}</div>}
          </div>
        ))}
      </div>
      {data.summary && (
        <p style={{ fontSize: "12px", color: "#166534", margin: "12px 0 0 0", fontStyle: "italic", lineHeight: 1.5 }}>{data.summary}</p>
      )}
      {urduSummary && (
        <div className={nastaliq.className} dir="rtl" style={{ fontSize: "13px", color: "#166534", margin: "8px 0 0 0", lineHeight: 1.9, textAlign: "right", fontWeight: 400 }}>
          {urduSummary}
        </div>
      )}
    </div>
  );
}

function TemplateVerdictHero({ report }: { report: CompletenessReport }) {
  const isTemplate = report.status === "template";
  return (
    <div style={{ background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)", border: "2px solid #93c5fd", borderRadius: "16px", padding: "24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: 900, flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>i</div>
      <div style={{ flex: 1, minWidth: "200px" }}>
        <div style={{ fontSize: "11px", fontWeight: 800, color: "#1e3a8a", letterSpacing: "0.1em", marginBottom: "4px", opacity: 0.75 }}>DOCUMENT STATUS</div>
        <div style={{ fontSize: "26px", fontWeight: 900, color: "#1e3a8a", marginBottom: "6px", letterSpacing: "-0.02em" }}>{isTemplate ? "BLANK OR TEMPLATE" : "INCOMPLETE DOCUMENT"}</div>
        <div style={{ fontSize: "14px", color: "#1e40af", opacity: 0.9, lineHeight: 1.4 }}>{report.message}</div>
      </div>
    </div>
  );
}

function FieldsToFillPanel({ report }: { report: CompletenessReport }) {
  if (!report.missingFields || report.missingFields.length === 0) return null;
  const groupedByCategory: Record<string, typeof report.missingFields> = {};
  for (const f of report.missingFields) {
    if (!groupedByCategory[f.category]) groupedByCategory[f.category] = [];
    groupedByCategory[f.category].push(f);
  }
  const categoryLabels: Record<string, string> = {
    party: "Party Details",
    financial: "Financial Details",
    date: "Dates",
    property: "Property Details",
    other: "Other Required Fields",
  };
  const categoryOrder = ["party", "financial", "date", "property", "other"];

  return (
    <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
      <div style={{ fontSize: "14px", fontWeight: 800, color: "#1e3a8a", marginBottom: "12px" }}>Fields To Fill Before Signing ({report.missingFields.length})</div>
      <div style={{ fontSize: "13px", color: "#1e40af", marginBottom: "12px", lineHeight: 1.5 }}>
        The following fields must be filled in by both parties before this document becomes legally binding:
      </div>
      {categoryOrder.filter((c) => groupedByCategory[c]).map((cat) => (
        <div key={cat} style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{categoryLabels[cat]}</div>
          <ul style={{ margin: 0, paddingLeft: "18px", color: "#1e40af", fontSize: "13px", lineHeight: 1.6 }}>
            {groupedByCategory[cat].map((f, i) => (<li key={i}>{f.label}</li>))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ClausesDetectedPanel({ smartFields }: { smartFields: any }) {
  const clauses = smartFields?.clauses;
  const legal = smartFields?.legal;
  if (!clauses && !legal) return null;

  const items: string[] = [];
  const labelize = (k: string) => k.replace(/_/g, " ").replace(/w/g, (c) => c.toUpperCase());

  if (clauses && typeof clauses === "object") {
    for (const k of Object.keys(clauses)) {
      const v = clauses[k];
      if (v === null || v === undefined) continue;
      if (typeof v === "string" && v.trim().length > 0) items.push(labelize(k) + ": " + v);
      else if (typeof v === "number" && v > 0) items.push(labelize(k) + ": " + v);
      else if (typeof v === "boolean" && v) items.push(labelize(k));
      else if (Array.isArray(v) && v.length > 0) items.push(labelize(k) + ": " + v.join(", "));
    }
  }
  if (legal && typeof legal === "object") {
    for (const k of Object.keys(legal)) {
      const v = legal[k];
      if (typeof v === "string" && v.trim().length > 0) items.push(labelize(k) + ": " + v);
    }
  }

  if (items.length === 0) return null;

  return (
    <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
      <div style={{ fontSize: "14px", fontWeight: 800, color: "#166534", marginBottom: "8px" }}>Clauses & Terms Detected ({items.length})</div>
      <div style={{ fontSize: "13px", color: "#166534", marginBottom: "10px", lineHeight: 1.5, opacity: 0.9 }}>
        The standard clauses and terms in this document appear to be present and reasonable:
      </div>
      <ul style={{ margin: 0, paddingLeft: "18px", color: "#166534", fontSize: "13px", lineHeight: 1.6 }}>
        {items.slice(0, 10).map((s, i) => (<li key={i}>{s}</li>))}
      </ul>
    </div>
  );
}

function CombinedVerdictHero({ combined, docCount, urduReasoning }: { combined: CombinedVerdict; docCount: number; urduReasoning?: string | null }) {
  const style = (() => {
    if (combined.verdict === "PROCEED" || combined.posture === "CLEAR") {
      return {
        bg: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
        color: "#14532d", border: "#86efac", icon: "OK", iconBg: "#16a34a",
        label: "PROCEED",
      };
    }
    if (combined.verdict === "DO_NOT_PROCEED" || combined.posture === "DO_NOT_PROCEED") {
      return {
        bg: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
        color: "#7f1d1d", border: "#fca5a5", icon: "!", iconBg: "#dc2626",
        label: "DO NOT PROCEED",
      };
    }
    return {
      bg: "linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)",
      color: "#713f12", border: "#facc15", icon: "?", iconBg: "#ca8a04",
      label: "PROCEED WITH CAUTION",
    };
  })();
  return (
    <div style={{ background: style.bg, border: "2px solid " + style.border, borderRadius: "16px", padding: "24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: style.iconBg, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", fontWeight: 900, flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>{style.icon}</div>
      <div style={{ flex: 1, minWidth: "200px" }}>
        <div style={{ fontSize: "11px", fontWeight: 800, color: style.color, letterSpacing: "0.1em", marginBottom: "4px", opacity: 0.75 }}>COMBINED VERDICT ({docCount} DOCUMENTS)</div>
        <div style={{ fontSize: "28px", fontWeight: 900, color: style.color, marginBottom: "6px", letterSpacing: "-0.02em" }}>{style.label}</div>
        {urduLabelFor(style.label) && (
          <div className={nastaliq.className} dir="rtl" style={{ fontSize: "22px", color: style.color, opacity: 0.85, marginBottom: "8px", fontWeight: 700, lineHeight: 1.4 }}>{urduLabelFor(style.label)}</div>
        )}
        <div style={{ fontSize: "14px", color: style.color, opacity: 0.9, lineHeight: 1.4 }}>{combined.reasoning}</div>
        {urduReasoning && (
          <div className={nastaliq.className} dir="rtl" style={{ fontSize: "14px", color: style.color, opacity: 0.85, marginTop: "6px", lineHeight: 1.9, fontWeight: 400 }}>{urduReasoning}</div>
        )}
      </div>
    </div>
  );
}

function CrossDocPanel({ crossDoc, urduAssessment }: { crossDoc: CrossDocResult; urduAssessment?: string | null }) {
  if (!crossDoc || !crossDoc.crossChecks || crossDoc.crossChecks.length === 0) return null;
  const statusStyle = (status: string, severity: string) => {
    if (status === "match") return { bg: "#f0fdf4", border: "#bbf7d0", tag: "#166534", tagBg: "#dcfce7", label: "MATCH", icon: "OK" };
    if (status === "mismatch" && severity === "critical") return { bg: "#fef2f2", border: "#fecaca", tag: "#991b1b", tagBg: "#fee2e2", label: "CRITICAL MISMATCH", icon: "!" };
    if (status === "mismatch") return { bg: "#fffbeb", border: "#fed7aa", tag: "#92400e", tagBg: "#fef3c7", label: "MISMATCH", icon: "!" };
    if (status === "partial_match") return { bg: "#eff6ff", border: "#bfdbfe", tag: "#1e40af", tagBg: "#dbeafe", label: "PARTIAL", icon: "~" };
    return { bg: "#f8fafc", border: "#e2e8f0", tag: "#475569", tagBg: "#f1f5f9", label: "UNVERIFIABLE", icon: "?" };
  };
  return (
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>Cross-Document Analysis</h3>
      {crossDoc.overallAssessment && (
        <p style={{ fontSize: "13px", color: "#475569", margin: "0 0 6px 0", lineHeight: 1.5 }}>{crossDoc.overallAssessment}</p>
      )}
      {urduAssessment && (
        <div className={nastaliq.className} dir="rtl" style={{ fontSize: "13px", color: "#475569", margin: "0 0 12px 0", lineHeight: 1.9, textAlign: "right" }}>{urduAssessment}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {crossDoc.crossChecks.map((c, i) => {
          const s = statusStyle(c.status, c.severity);
          return (
            <div key={i} style={{ backgroundColor: s.bg, border: "1px solid " + s.border, borderRadius: "12px", padding: "12px 14px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: s.tag, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: s.tag, backgroundColor: s.tagBg, padding: "2px 6px", borderRadius: "4px", letterSpacing: "0.05em" }}>{s.label}</span>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.category}</span>
                </div>
                <div style={{ fontSize: "13px", color: "#0f172a", lineHeight: 1.5 }}>{c.finding}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocTypeDropdown({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const grouped = groupedDocumentTypes();
  return (
    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "10px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)", zIndex: 30, maxHeight: "320px", overflowY: "auto" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Set Document Type</div>
      <button
        onClick={() => { onChange(""); onClose(); }}
        style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: value === "" ? "#f0fdf4" : "#ffffff", border: "none", cursor: "pointer", fontSize: "12px", color: "#64748b", fontStyle: "italic" }}
      >
        Auto-detect (recommended)
      </button>
      {grouped.map((group) => (
        <div key={group.category}>
          <div style={{ padding: "8px 12px 4px 12px", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: "#f8fafc" }}>{group.label}</div>
          {group.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); onClose(); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", background: value === opt.value ? "#f0fdf4" : "#ffffff", border: "none", cursor: "pointer", fontSize: "12px", color: "#0f172a" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function RiskScoreCard({ riskScore, riskLabel, riskFactors, scoreBreakdown }: {
  riskScore: number;
  riskLabel: string;
  riskFactors: Array<{ label: string; points: number; category: string }>;
  scoreBreakdown?: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    LOW:      { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46", badge: "#16a34a" },
    MEDIUM:   { bg: "#fefce8", border: "#fde68a", text: "#713f12", badge: "#ca8a04" },
    HIGH:     { bg: "#fff7ed", border: "#fed7aa", text: "#7c2d12", badge: "#ea580c" },
    CRITICAL: { bg: "#fef2f2", border: "#fecaca", text: "#7f1d1d", badge: "#dc2626" },
  };
  const c = colorMap[riskLabel] || colorMap.MEDIUM;
  const categoryIcon: Record<string, string> = {
    financial: "\u{1F4B0}",
    identity: "\u{1F4CB}",
    legal: "\u2696\uFE0F",
    document: "\u{1F4C4}",
    completeness: "\u{1F50D}",
  };
  return (
    <div style={{ backgroundColor: c.bg, border: "1px solid " + c.border, borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: riskFactors.length > 0 ? "14px" : "0", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: c.text, letterSpacing: "0.1em", marginBottom: "4px", opacity: 0.75, textTransform: "uppercase" as const }}>Transaction Risk Score</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "36px", fontWeight: 900, color: c.text, lineHeight: 1 }}>{riskScore}<span style={{ fontSize: "16px", opacity: 0.7 }}>/10</span></span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: c.badge, backgroundColor: c.badge + "18", padding: "2px 10px", borderRadius: "6px", letterSpacing: "0.05em" }}>{riskLabel} RISK</span>
          </div>
        </div>
      </div>
      {riskFactors.length > 0 && (
        <div style={{ borderTop: "1px solid " + c.border, paddingTop: "12px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: c.text, marginBottom: "8px" }}>Contributing Factors:</div>
          <ul style={{ margin: 0, paddingLeft: "0", listStyle: "none" }}>
            {riskFactors.map((f, i) => (
              <li key={i} style={{ fontSize: "13px", color: c.text, lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "4px" }}>
                <span style={{ flexShrink: 0 }}>{categoryIcon[f.category] || "\u26A0\uFE0F"}</span>
                <span>{f.label} <span style={{ fontSize: "11px", opacity: 0.7 }}>({f.points > 0 ? "+" : ""}{f.points})</span></span>
              </li>
            ))}
          </ul>
          {scoreBreakdown && (
            <details style={{ marginTop: "10px" }}>
              <summary style={{ fontSize: "11px", fontWeight: 600, color: c.text, opacity: 0.7, cursor: "pointer", userSelect: "none" as const }}>
                How is this score calculated?
              </summary>
              <p style={{ fontSize: "11px", color: c.text, opacity: 0.8, margin: "6px 0 0", lineHeight: 1.5 }}>
                {scoreBreakdown}. Base starts at 1 (no issues). Each factor adds its absolute points. Maximum 10.
              </p>
            </details>
          )}
        </div>
      )}
      {riskFactors.length === 0 && scoreBreakdown && (
        <p style={{ fontSize: "11px", color: c.text, opacity: 0.7, margin: "8px 0 0" }}>{scoreBreakdown}</p>
      )}
    </div>
  );
}
function VerdictHero({ verdict, posture, pakkaScore, urduHeadline }: { verdict: string; posture: string; pakkaScore: number; urduHeadline?: string | null }) {
  const style = (() => {
    if (verdict === "PROCEED" || posture === "CLEAR") {
      return {
        bg: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
        color: "#14532d",
        border: "#86efac",
        icon: "OK",
        iconBg: "#16a34a",
        label: "PROCEED",
        headline: "This document looks safe to move forward with.",
      };
    }
    if (verdict === "STOP" || verdict === "BLOCKED" || verdict === "REJECT" || posture === "DO_NOT_PROCEED") {
      return {
        bg: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
        color: "#7f1d1d",
        border: "#fca5a5",
        icon: "!",
        iconBg: "#dc2626",
        label: "DO NOT PROCEED",
        headline: "Serious issues found. Do not release money or sign.",
      };
    }
    return {
      bg: "linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)",
      color: "#713f12",
      border: "#facc15",
      icon: "?",
      iconBg: "#ca8a04",
      label: "PROCEED WITH CAUTION",
      headline: "Some evidence is missing. See What To Do Next.",
    };
  })();

  return (
    <div style={{ background: style.bg, border: "2px solid " + style.border, borderRadius: "16px", padding: "24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
      <div style={{ width: "72px", height: "72px", borderRadius: "50%", backgroundColor: style.iconBg, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", fontWeight: 900, flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        {style.icon}
      </div>
      <div style={{ flex: 1, minWidth: "200px" }}>
        <div style={{ fontSize: "11px", fontWeight: 800, color: style.color, letterSpacing: "0.1em", marginBottom: "4px", opacity: 0.75 }}>VERDICT</div>
        <div style={{ fontSize: "28px", fontWeight: 900, color: style.color, marginBottom: "6px", letterSpacing: "-0.02em" }}>{style.label}</div>
        {urduLabelFor(style.label) && (
          <div className={nastaliq.className} dir="rtl" style={{ fontSize: "22px", color: style.color, opacity: 0.85, marginBottom: "8px", fontWeight: 700, lineHeight: 1.4 }}>{urduLabelFor(style.label)}</div>
        )}
        <div style={{ fontSize: "14px", color: style.color, opacity: 0.9, lineHeight: 1.4 }}>{style.headline}</div>
        {urduHeadline && (
          <div className={nastaliq.className} dir="rtl" style={{ fontSize: "14px", color: style.color, opacity: 0.85, marginTop: "6px", lineHeight: 1.9, fontWeight: 400 }}>{urduHeadline}</div>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: "11px", fontWeight: 800, color: style.color, letterSpacing: "0.1em", marginBottom: "2px", opacity: 0.75 }}>PAKKASCORE</div>
        <div style={{ fontSize: "36px", fontWeight: 900, color: style.color, lineHeight: 1 }}>{Math.round(pakkaScore)}<span style={{ fontSize: "16px", opacity: 0.7 }}>/100</span></div>
      </div>
    </div>
  );
}

function NextStepsPanel({ steps, urduTranslations }: { steps: NextStep[]; urduTranslations?: Record<string, string> }) {
  if (!steps || steps.length === 0) return null;
  const priorityStyle = (p: string) => {
    if (p === "high") return { bg: "#fef2f2", border: "#fecaca", tag: "#991b1b", tagBg: "#fee2e2", label: "DO FIRST" };
    if (p === "low") return { bg: "#f0fdf4", border: "#bbf7d0", tag: "#166534", tagBg: "#dcfce7", label: "OPTIONAL" };
    return { bg: "#eff6ff", border: "#bfdbfe", tag: "#1e40af", tagBg: "#dbeafe", label: "IMPORTANT" };
  };
  return (
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 12px 0" }}>What To Do Next</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {steps.map((s, i) => {
          const ps = priorityStyle(s.priority);
          return (
            <div key={i} style={{ backgroundColor: ps.bg, border: "1px solid " + ps.border, borderRadius: "12px", padding: "14px 16px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#0b132b", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{s.title}</span>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: ps.tag, backgroundColor: ps.tagBg, padding: "2px 6px", borderRadius: "4px", letterSpacing: "0.05em" }}>{ps.label}</span>
                </div>
                {urduTranslations?.["nextStepTitle_" + i] && (
                  <div className={nastaliq.className} dir="rtl" style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "4px", lineHeight: 1.8, textAlign: "right" }}>{urduTranslations["nextStepTitle_" + i]}</div>
                )}
                <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>{s.detail}</div>
                {urduTranslations?.["nextStepDetail_" + i] && (
                  <div className={nastaliq.className} dir="rtl" style={{ fontSize: "13px", color: "#334155", marginTop: "4px", lineHeight: 1.9, textAlign: "right" }}>{urduTranslations["nextStepDetail_" + i]}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ScanPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [fileTags, setFileTags] = useState<string[]>([]); // per-file document type hints (empty string = auto-detect)
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : { authenticated: false }))
      .then((data) => {
        if (cancelled) return;
        if (data.authenticated) setSessionUser(data.user);
        setSessionLoaded(true);
      })
      .catch(() => { if (!cancelled) setSessionLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setSessionUser(null);
    if (typeof window !== "undefined") window.location.reload();
  }
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(-1);
  const [results, setResults] = useState<BackendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDocsExpanded, setIsDocsExpanded] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (results && resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [results]);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setCurrentStageIndex(0);
      let stage = 0;
      interval = setInterval(() => {
        stage++;
        if (stage < STAGES.length) setCurrentStageIndex(stage);
        else clearInterval(interval);
      }, 3000);
    } else if (results) {
      setCurrentStageIndex(STAGES.length);
    } else {
      setCurrentStageIndex(-1);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, results]);

  useEffect(() => {
    if (results) setActiveStep(2);
    else if (isAnalyzing) setActiveStep(1);
    else setActiveStep(0);
  }, [files, isAnalyzing, results]);

  // --- Entitlement summary state ---
  const [entitlements, setEntitlements] = React.useState<{
    credits: Array<{ type: string; count: number }>;
    total: number;
    loaded: boolean;
    signedIn: boolean;
  }>({ credits: [], total: 0, loaded: false, signedIn: false });

  const refreshEntitlements = React.useCallback(async () => {
    try {
      const res = await fetch("/api/entitlements", { credentials: "same-origin" });
      if (res.status === 401) {
        setEntitlements({ credits: [], total: 0, loaded: true, signedIn: false });
        return;
      }
      const data = await res.json();
      setEntitlements({
        credits: data.credits || [],
        total: data.total || 0,
        loaded: true,
        signedIn: true,
      });
    } catch {
      setEntitlements((prev) => ({ ...prev, loaded: true }));
    }
  }, []);

  React.useEffect(() => {
    refreshEntitlements();
  }, [refreshEntitlements]);

  const processFiles = (fileList: File[]) => {
    setFiles(fileList);
    setFileTags(fileList.map(() => "")); // reset tags - all auto-detect by default
    setOpenDropdownIdx(null);
    setResults(null);
    setError(null);
    const previews = fileList.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : "pdf_placeholder"));
    setFilePreviews(previews);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const clearFiles = () => {
    setFiles([]);
    setFilePreviews([]);
    setFileTags([]);
    setOpenDropdownIdx(null);
    setResults(null);
    setError(null);
    setIsAnalyzing(false);
    setCurrentStageIndex(-1);
  };

  const handleScan = async () => {
    if (!files || files.length === 0) return;
    setIsAnalyzing(true);
    setCurrentStageIndex(0);
    setResults(null);
    setError(null);
    try {
      const formData = new FormData();
      files.forEach((f, i) => {
        formData.append("files", f);
        // Send per-file document type hint. Empty string means auto-detect.
        formData.append("documentTypeHints", fileTags[i] || "");
      });
      const response = await fetch("/api/beta/scan", { method: "POST", body: formData });
      const text = await response.text();
      let payload: any = null;
      try { payload = text ? JSON.parse(text) : null; } catch { throw new Error("Server returned an invalid response."); }
      if (!response.ok) {
        // Handle no-entitlement case (Payment Required)
        if (response.status === 402) {
          alert(payload?.message || "You need to purchase a scan credit before analysing documents.");
          window.location.href = payload?.redirectTo || "/#pricing";
          return;
        }
        // Handle too many files for tier
        if (response.status === 400 && payload?.error === "TOO_MANY_FILES") {
          alert(payload?.message || "Too many files for this credit tier.");
          return;
        }
        // Handle not-signed-in case
        if (response.status === 401) {
          alert(payload?.message || "Please sign in to continue.");
          window.location.href = "/login";
          return;
        }
        const code = payload?.error || "INTERNAL_ERROR";
      // Also refresh entitlements after any response (success or non-blocking error)
      void refreshEntitlements();
        const map: Record<string, string> = {
          NO_DOCUMENTS: "Please upload at least one file.",
          UNSUPPORTED_CONTENT_TYPE: "That file type is not supported.",
          UPLOAD_TOO_LARGE: "Files must be under 15MB.",
          NOT_SIGNED_IN: "Please sign in to use PakkaScan.",
          INTERNAL_ERROR: "Something went wrong on the server. Please try again.",
        };
        throw new Error(map[code] || "Scan failed: " + code);
      }
      setResults(payload as BackendResponse);
    } catch (err: any) {
      console.error("[scan]", err);
      setError(err?.message || "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDraggingOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDraggingOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(Array.from(e.dataTransfer.files));
  }, []);

  const verdict = results?.phase2?.result?.decision || "REVIEW";
  const posture = results?.phase2?.posture || "CAUTIOUS";
  const pakkaScore = results?.phase2?.result?.pakkaScore ?? 0;
  const missing = results?.phase2?.missingEvidence?.missing ?? [];
  const findings = results?.phase2?.result?.findings ?? [];
  const nextSteps = results?.phase2?.nextSteps ?? [];
  const firstDoc = results?.documents?.[0];
  const completeness = firstDoc?.completeness;
  const isTemplateOrPartial = completeness && (completeness.status === "template" || completeness.status === "partial");
  const combinedVerdict = results?.combinedVerdict ?? null;
  const crossDoc = results?.crossDoc ?? null;
  const isMultiDoc = (results?.documents?.length ?? 0) >= 2;
  const urduTranslations = results?.urduTranslations ?? {};
  const riskScore = results?.riskScore ?? null;
  const riskLabel = results?.riskLabel ?? null;
  const riskFactors = results?.riskFactors ?? [];
  const scoreBreakdown = results?.scoreBreakdown ?? undefined;

  const stringifyItem = (m: any): string => {
    if (typeof m === "string") return m;
    return m.label || m.message || m.description || m.field || m.documentType || m.type || m.code || JSON.stringify(m);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{"@media (max-width: 640px) { .pks-facts-grid { grid-template-columns: 1fr !important; } } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(11, 19, 43, 0.15); } 50% { box-shadow: 0 0 0 8px rgba(11, 19, 43, 0.08); } }"}</style>

      <div style={{ width: "100%", backgroundColor: "#0b132b", display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px 100px 20px", boxSizing: "border-box", position: "relative" }}>
        {/* Top-right auth chip */}
        <div style={{ position: "absolute", top: "16px", right: "16px", zIndex: 5 }}>
          {!sessionLoaded ? null : sessionUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: 600 }}>{sessionUser.email}</div>
              <button onClick={handleSignOut} style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Sign out</button>
            </div>
          ) : (
            <a href="/login" style={{ display: "inline-flex", alignItems: "center", padding: "6px 14px", backgroundColor: "rgba(255,255,255,0.1)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>Sign in</a>
          )}
        </div>
        <div style={{ width: "84px", height: "84px", borderRadius: "50%", backgroundColor: "#0b132b", border: "3px solid #ffffff", boxShadow: "0 0 0 4px rgba(255, 255, 255, 0.15), inset 0 0 12px rgba(255, 255, 255, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
          <svg width="40" height="40" style={{ color: "#ffffff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className={fraunces.className} style={{ fontSize: "42px", fontWeight: 900, letterSpacing: "-0.02em", color: "#ffffff", marginBottom: "10px", textAlign: "center" }}>
          Pakka<span style={{ color: "#16a34a", fontStyle: "italic" }}>Scan</span>
        </div>
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: "32px", textAlign: "center" }}>
          LEGAL DUE DILIGENCE <span style={{ margin: "0 6px", color: "#16a34a" }}>*</span> AI-POWERED
        </div>
        <h1 style={{ fontSize: "30px", fontWeight: 800, color: "#ffffff", textAlign: "center", maxWidth: "640px", lineHeight: 1.3, margin: 0 }}>
          Don&apos;t hand over <span style={{ color: "#d4af37" }}>bayana</span> until PakkaScan has read the fine print you didn&apos;t.
        </h1>
      </div>

      <div style={{ width: "100%", maxWidth: "720px", padding: "0 20px", marginTop: "-44px", boxSizing: "border-box", zIndex: 10 }}>
        <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)", display: "flex", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          {[{ num: "01", label: "Upload" }, { num: "02", label: "PakkaScan analyses" }, { num: "03", label: "Get Verdict" }].map((step, idx) => (
            <div key={idx} style={{ flex: 1, padding: "20px 10px", textAlign: "center", borderRight: idx < 2 ? "1px solid #f1f5f9" : "none", backgroundColor: activeStep === idx ? "#f0fdf4" : "#ffffff", transition: "background-color 0.3s" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: activeStep >= idx ? "#16a34a" : "#94a3b8", marginBottom: "2px", letterSpacing: "0.05em" }}>{step.num}</div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: activeStep >= idx ? "#0f172a" : "#94a3b8" }}>{step.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", maxWidth: "720px", padding: "32px 20px 60px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px", textAlign: "center", position: "relative" }}>
          Reads <strong style={{ color: "#0f172a", fontWeight: 700 }}>{MAIN_DOCS.join(", ")}</strong>
          <span onClick={() => setIsDocsExpanded(!isDocsExpanded)} style={{ backgroundColor: "#e2e8f0", color: "#334155", fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", display: "inline-block", margin: "0 4px", cursor: "pointer" }}>
            {isDocsExpanded ? "less" : "+6 more"}
          </span>
          &mdash; auto-detected, no need to sort first.
          {isDocsExpanded && (
            <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: "8px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "16px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", zIndex: 20, width: "280px", textAlign: "left" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginBottom: "8px", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>All Supported Formats:</div>
              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "4px" }}>
                {ALL_SUPPORTED_DOCS.map((doc, idx) => <li key={idx}>{doc}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* --- Entitlement Banner --- */}
        {entitlements.loaded && entitlements.signedIn && (
          entitlements.total > 0 ? (
            <div style={{ width: "100%", backgroundColor: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "14px 18px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#16a34a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 900, flexShrink: 0 }}>OK</div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#166534" }}>
                    You have {entitlements.total} scan credit{entitlements.total === 1 ? "" : "s"} available
                  </div>
                  <div style={{ fontSize: "12px", color: "#166534", opacity: 0.85, marginTop: "2px" }}>
                    {entitlements.credits.map((c, i) => (
                      <span key={c.type}>
                        {i > 0 && " x "}
                        {c.count}x {c.type === "rental" ? "Rental Safety Check (2 files max)" : c.type === "bayana" ? "Bayana Safety Check (3 files max)" : "Full Property Due Diligence (5 files max)"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <a href="/#pricing" style={{ fontSize: "12px", color: "#166534", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}>Buy more credits</a>
            </div>
          ) : (
            <div style={{ width: "100%", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px 18px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#dc2626", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 900, flexShrink: 0 }}>!</div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#991b1b" }}>
                    You have no scan credits
                  </div>
                  <div style={{ fontSize: "12px", color: "#991b1b", opacity: 0.85, marginTop: "2px" }}>
                    Purchase a credit before uploading documents.
                  </div>
                </div>
              </div>
              <a href="/#pricing" style={{ fontSize: "13px", color: "#ffffff", backgroundColor: "#dc2626", fontWeight: 700, textDecoration: "none", padding: "8px 16px", borderRadius: "8px", whiteSpace: "nowrap" }}>Purchase a scan</a>
            </div>
          )
        )}

        <div style={{ width: "100%", border: "2px dashed #cbd5e1", borderRadius: "16px", padding: "40px 24px", textAlign: "center", backgroundColor: isDraggingOver ? "rgba(22, 163, 74, 0.08)" : "#ffffff", transition: "background-color 0.2s", boxSizing: "border-box", position: "relative", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <div style={{ position: "absolute", right: "-24px", bottom: "-16px", transform: "rotate(-12deg)", pointerEvents: "none", opacity: 0.12, border: "2px dashed #0b132b", borderRadius: "50%", width: "110px", height: "110px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", fontSize: "11px", fontWeight: 900, color: "#0b132b", textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1.1 }}>
              PAKKA<br />VERIFIED<br /><span style={{ fontSize: "9px" }}>SECURE</span>
            </div>
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", marginBottom: "10px", marginTop: 0 }}>Upload your documents</h2>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "28px", marginTop: 0, lineHeight: 1.5, maxWidth: "440px", marginLeft: "auto", marginRight: "auto" }}>
            We&apos;ll identify the document type, run OCR in English &amp; Urdu, and flag anything that puts your money at risk.
          </p>
          <label tabIndex={0} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", backgroundColor: "#0b132b", color: "#ffffff", fontWeight: 600, fontSize: "14px", borderRadius: "10px", cursor: "pointer", boxShadow: "0 4px 12px rgba(11, 19, 43, 0.2)", outline: "none" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Document
            <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff" onChange={handleFileChange} style={{ display: "none" }} />
          </label>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "16px", fontFamily: "monospace" }}>
            or drag &amp; drop &middot; PDF, JPG, PNG up to 15MB
          </div>
        </div>

        {files.length > 0 && (
          <div style={{ width: "100%", marginTop: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 600, color: "#374151", margin: 0 }}>Selected Document ({files.length}):</h4>
              <button onClick={clearFiles} style={{ background: "none", border: "none", color: "#dc2626", fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: 0 }}>Clear</button>
            </div>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
              {files.map((file, idx) => {
                const tag = fileTags[idx] || "";
                const tagLabel = tag ? (DOCUMENT_TYPE_OPTIONS.find(o => o.value === tag)?.label || tag) : "Auto-detect";
                const isDropdownOpen = openDropdownIdx === idx;
                return (
                  <div key={idx} style={{ position: "relative", width: "140px" }}>
                    <div style={{ width: "140px", height: "128px", border: "1px solid #cbd5e1", borderRadius: "12px", overflow: "hidden", backgroundColor: "#f8fafc", position: "relative", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} title={file.name}>
                      {filePreviews[idx] === "pdf_placeholder" ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "8px" }}>
                          <div style={{ width: "40px", height: "40px", backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800 }}>PDF</div>
                          <span style={{ fontSize: "9px", color: "#6b7280", padding: "0 4px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>{file.name}</span>
                        </div>
                      ) : (
                        <img src={filePreviews[idx]} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <button
                      onClick={() => setOpenDropdownIdx(isDropdownOpen ? null : idx)}
                      style={{
                        width: "100%", marginTop: "6px", padding: "6px 8px",
                        backgroundColor: tag ? "#dcfce7" : "#f1f5f9",
                        color: tag ? "#166534" : "#475569",
                        border: "1px solid " + (tag ? "#bbf7d0" : "#cbd5e1"),
                        borderRadius: "8px", fontSize: "10px", fontWeight: 700,
                        cursor: "pointer", textAlign: "center",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                      }}
                    >
                      {tagLabel}
                    </button>
                    {isDropdownOpen && (
                      <DocTypeDropdown
                        value={tag}
                        onChange={(v) => setFileTags((prev) => { const next = [...prev]; next[idx] = v; return next; })}
                        onClose={() => setOpenDropdownIdx(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom: "24px", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", backgroundColor: "#ffffff" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginBottom: "8px", marginTop: 0, textAlign: "center" }}>Deep Analysis Engine</h4>
              {isAnalyzing && currentStageIndex >= 0 && (
                <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", margin: "0 0 20px 0", fontStyle: "italic" }}>
                  {STAGES[Math.min(currentStageIndex, STAGES.length - 1)]?.subtext || "Processing..."}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                <div style={{ position: "absolute", top: "16px", left: "3%", right: "3%", height: "4px", backgroundColor: "#e2e8f0", borderRadius: "2px", zIndex: 0 }}>
                  <div style={{ width: (Math.max(0, (currentStageIndex / STAGES.length) * 94)) + "%", height: "100%", backgroundColor: "#0b132b", borderRadius: "2px", transition: "width 0.8s ease-in-out" }} />
                </div>
                {STAGES.map((stage, index) => {
                  const isActive = index === currentStageIndex;
                  const isComplete = index < currentStageIndex;
                  return (
                    <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", zIndex: 1 }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, backgroundColor: isComplete ? "#0b132b" : isActive ? "#ffffff" : "#f1f5f9", color: isComplete ? "#ffffff" : isActive ? "#0b132b" : "#64748b", border: isActive ? "2px solid #0b132b" : "none", boxShadow: isActive ? "0 0 0 4px rgba(11, 19, 43, 0.15)" : "none", transition: "all 0.3s ease", animation: isActive ? "pulse 2s infinite" : "none" }}>
                        {isComplete ? "OK" : stage.icon}
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: isComplete || isActive ? 700 : 500, color: isComplete || isActive ? "#0f172a" : "#64748b" }}>{stage.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#991b1b", margin: "0 0 4px 0" }}>Analysis Failed</p>
                <p style={{ fontSize: "13px", color: "#b91c1c", margin: 0 }}>{error}</p>
              </div>
            )}

            <button onClick={handleScan} disabled={isAnalyzing || (entitlements.loaded && entitlements.total === 0)} style={{ width: "100%", padding: "16px 24px", backgroundColor: "#0b132b", color: "#ffffff", fontWeight: 700, fontSize: "16px", borderRadius: "12px", border: "none", cursor: (isAnalyzing || (entitlements.loaded && entitlements.total === 0)) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", opacity: (isAnalyzing || (entitlements.loaded && entitlements.total === 0)) ? 0.5 : 1, boxShadow: "0 4px 12px rgba(11, 19, 43, 0.25)", transition: "opacity 0.2s" }}>
              {isAnalyzing ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{STAGES[Math.min(currentStageIndex, STAGES.length - 1)]?.subtext || "Analyzing..."}</span>
                </>
              ) : <span>Analyse Document Securely</span>}
            </button>
          </div>
        )}

        {results && (
          <div ref={resultsRef} style={{ width: "100%", paddingTop: "24px", marginTop: "32px", backgroundColor: "#ffffff", padding: "28px", borderRadius: "16px", border: "1px solid #e2e8f0", boxSizing: "border-box", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08)" }}>
            <div className="no-print pks-ctrlp-tip" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", marginBottom: "16px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "12px", color: "#1e40af", lineHeight: 1.5 }}>
              <span style={{ fontSize: "14px" }}>&#128190;</span>
              <span><strong>Tip:</strong> Press <kbd style={{ padding: "1px 6px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "4px", fontFamily: "monospace", fontSize: "11px" }}>Ctrl</kbd> + <kbd style={{ padding: "1px 6px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "4px", fontFamily: "monospace", fontSize: "11px" }}>P</kbd> to save this report as a PDF for your records.</span>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px 0" }}>{results.tier === "rental" ? "Rental Safety Check" : results.tier === "bayana" ? "Bayana Safety Check" : "Full Property Due Diligence"}</h3>
                {results.referenceCode && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace", backgroundColor: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      Ref: <span style={{ fontWeight: 700, color: "#0f172a" }}>{results.referenceCode}</span>
                    </div>
                    <a
                      href={`/verify/${encodeURIComponent(results.referenceCode)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "10px", color: "#059669", textDecoration: "none", fontWeight: 500 }}
                    >
                      Verify at pakkascan.com/verify &rarr;
                    </a>
                  </div>
                )}
              </div>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                {results.documents.length === 1
                  ? humanDocType(results.documents[0]?.classification?.documentType)
                  : results.documents.length + " documents analysed"}
              </p>
            </div>

            <div style={{ height: "16px" }} />

            {isMultiDoc && combinedVerdict ? (
              <CombinedVerdictHero combined={combinedVerdict} docCount={results?.documents?.length ?? 0} urduReasoning={urduTranslations["combinedReasoning"]} />
            ) : isTemplateOrPartial && completeness ? (
              <>
                <TemplateVerdictHero report={completeness} />
                <FieldsToFillPanel report={completeness} />
                {firstDoc?.smartFields && <ClausesDetectedPanel smartFields={firstDoc.smartFields} />}
              </>
            ) : (
              <VerdictHero verdict={verdict} posture={posture} pakkaScore={pakkaScore} urduHeadline={urduTranslations["verdictHeadline"]} />
            )}

            {/* Always show risk + chain when present (all tiers / multi-doc) */}
            {riskScore !== null && riskLabel && (
              <RiskScoreCard riskScore={riskScore} riskLabel={riskLabel} riskFactors={riskFactors} scoreBreakdown={scoreBreakdown} />
            )}
            {riskScore !== null && riskLabel && (
              <RiskMeaningStrip riskScore={riskScore} riskLabel={riskLabel} riskFactors={riskFactors} />
            )}
            <ValuationComparisonCard data={results?.valuationComparison} />
            <FlaggedClausesPanel flagged={results?.clauseConcerns?.flagged} missing={results?.clauseConcerns?.missing} referenceCode={results?.referenceCode} />
            <FeedbackButton referenceCode={results?.referenceCode} />
            {results?.chainOfTitle && (
              <OwnershipTimeline result={results.chainOfTitle} tier={results.tier ?? undefined} />
            )}
            {crossDoc && <CrossDocPanel crossDoc={crossDoc} urduAssessment={urduTranslations["crossDocAssessment"]} />}
            {!isTemplateOrPartial && (
              <NextStepsPanel steps={nextSteps} urduTranslations={urduTranslations} />
            )}
            {results.tier === "rental" && isMultiDoc && (
              <div style={{ marginTop: "20px", padding: "16px 20px", backgroundColor: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "20px", flexShrink: 0 }}>&#128200;</div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#78350f", marginBottom: "2px" }}>Cross-document analysis available on Bayana</div>
                  <div style={{ fontSize: "12px", color: "#92400e", lineHeight: 1.5 }}>You uploaded {results?.documents?.length ?? 0} files. Upgrade to Bayana Safety Check to see how your documents match up, including seller CNIC verification against the Fard.</div>
                </div>
                <a href="/pricing" style={{ padding: "8px 16px", backgroundColor: "#0b132b", color: "#ffffff", fontWeight: 700, fontSize: "13px", borderRadius: "8px", textDecoration: "none", flexShrink: 0 }}>See plans</a>
              </div>
            )}

            {missing.length > 0 && (
              <div style={{ backgroundColor: "#fef9c3", padding: "16px", borderRadius: "12px", border: "1px solid #fde68a", marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#854d0e", marginBottom: "10px" }}>Missing Evidence ({missing.length})</div>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#854d0e", fontSize: "13px", lineHeight: 1.6 }}>
                  {missing.slice(0, 8).map((m: any, i: number) => (
                    <li key={i}>{stringifyItem(m)}</li>
                  ))}
                </ul>
              </div>
            )}

            {findings.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "10px" }}>Findings ({findings.length})</div>
                {findings.slice(0, 10).map((f: any, i: number) => (
                  <div key={i} style={{ backgroundColor: "#fffbeb", border: "1px solid #fed7aa", borderRadius: "10px", padding: "12px", marginBottom: "8px" }}>
                    <div style={{ fontSize: "13px", color: "#92400e", fontWeight: 600 }}>
                      {stringifyItem(f)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px", marginTop: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Document Details</div>

              {results.documents.map((doc, i) => (
                <div key={i} style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{doc.fileName}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Identified as: <strong style={{ color: "#0f172a" }}>{humanDocType(doc.classification?.documentType)}</strong>
                    </div>
                  </div>

                  {doc.smartFields && !doc.smartFields.extractionError ? (
                    <SmartFieldsPanel data={doc.smartFields} urduSummary={urduTranslations["docSummary_" + i]} />
                  ) : (
                    <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", marginTop: "8px" }}>
                      {doc.smartFields?.extractionError || "Analysing this document type requires additional support. Structured extraction was not available."}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}

        {results?.referenceCode && (
          <div style={{ marginTop: "36px", paddingTop: "24px", borderTop: "1px solid #e2e8f0" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              padding: "20px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}>
              <div style={{
                backgroundColor: "#ffffff",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                lineHeight: 0,
              }}>
                <QRCodeSVG
                  value={`https://www.pakkascan.com/verify/${results.referenceCode}`}
                  size={130}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
                  Verify this report
                </div>
                <div style={{ fontSize: "12px", color: "#475569", marginBottom: "10px", lineHeight: 1.5 }}>
                  Scan the QR code or visit the URL below to confirm this report
                  was issued by PakkaScan.
                </div>
                <div style={{
                  fontSize: "11px",
                  fontFamily: "monospace",
                  color: "#0f172a",
                  backgroundColor: "#ffffff",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  wordBreak: "break-all",
                }}>
                  pakkascan.com/verify/{results.referenceCode}
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "8px", fontStyle: "italic" }}>
                  Public verification does not reveal document contents.
                </div>
                <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                  <WhatsAppShareButton
                    variant="results"
                    referenceCode={results.referenceCode}
                    verifyUrl={`https://www.pakkascan.com/verify/${results.referenceCode}`}
                    verdict={verdict}
                    pakkaScore={pakkaScore}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const payload = {
                          referenceCode: results.referenceCode,
                          scannedAt: new Date().toISOString(),
                          reportType: results.tier || "SCAN",
                          riskScore: riskScore ?? 1,
                          riskLabel: riskLabel || "MEDIUM",
                          riskFactors: riskFactors || [],
                          scoreBreakdown: scoreBreakdown,
                          verdict: verdict || "REVIEW",
                          pakkaScore: pakkaScore,
                          verifyUrl: `https://www.pakkascan.com/verify/${results.referenceCode}`,
                          valuationComparison: results.valuationComparison || null,
                          keyFacts: [],
                        };
                        const res = await fetch("/api/beta/report/pdf", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        });
                        if (!res.ok) throw new Error("PDF generation failed");
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `PakkaScan-Passport-${results.referenceCode}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        console.error("PDF download failed", e);
                        alert("Could not generate PDF. Please try again.");
                      }
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "13px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Download PDF Passport
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "28px", marginTop: "40px", flexWrap: "wrap" }}>
          {["Bank-grade encryption", "Docs deleted after scan", "AI-powered analysis"].map((text, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155", fontWeight: 600 }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 900 }}>OK</div>
              {text}
            </div>
          ))}
        </div>

        {/* WhatsApp support button - always visible in scan page footer */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "28px" }}>
          <a
            href={"https://wa.me/923156507067?text=" + encodeURIComponent("Hi PakkaScan, I have a question about my scan report.")}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 20px",
              backgroundColor: "#25D366",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
              borderRadius: "12px",
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)",
              transition: "transform 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Message us on WhatsApp
          </a>
        </div>
      </div>
      <WhatsAppFAB />
    </div>
  );
}





