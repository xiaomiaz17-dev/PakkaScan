/**
 * Property Passport PDF — v1.1 (with embedded QR)
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer,
} from "@react-pdf/renderer";
import QRCode from "qrcode";

export type PassportRiskFactor = {
  label: string;
  points: number;
  category: string;
};

export type PassportValuation = {
  declaredPricePkr?: number | null;
  officialValuePkr?: number | null;
  ratio?: number | null;
  matchLabel?: string | null;
};

export type PassportData = {
  referenceCode: string;
  scannedAt: string;
  reportType: string;
  riskScore: number;
  riskLabel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskFactors: PassportRiskFactor[];
  scoreBreakdown?: string;
  verdict: string;
  pakkaScore: number | null;
  keyFacts?: Array<{ label: string; value: string }>;
  verifyUrl: string;
  valuation?: PassportValuation | null;
};

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: "#1e293b" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#0d9488",
    paddingBottom: 12,
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#0d9488" },
  brandSub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  meta: { textAlign: "right", fontSize: 9, color: "#475569" },
  metaBold: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#0f172a" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 8,
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 10 },
  scoreBadge: { width: 64, height: 64, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  scoreNumber: { fontSize: 28, fontFamily: "Helvetica-Bold", color: "#fff" },
  scoreOutOf: { fontSize: 9, color: "#fff", opacity: 0.85 },
  labelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },
  factorList: { marginTop: 6 },
  factorItem: { flexDirection: "row", marginBottom: 4, paddingLeft: 4 },
  factorBullet: { width: 14, fontSize: 9, color: "#64748b" },
  factorText: { flex: 1, fontSize: 9, lineHeight: 1.4 },
  breakdown: { fontSize: 8, color: "#64748b", marginTop: 6, fontStyle: "italic" },
  verdictBox: { padding: 12, borderRadius: 6, marginTop: 4 },
  verdictLabel: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  verdictSub: { fontSize: 9, color: "#475569" },
  factsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  factCell: {
    width: "48%",
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  factLabel: { fontSize: 7, color: "#64748b", textTransform: "uppercase", marginBottom: 2 },
  factValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 14,
  },
  qrImage: { width: 90, height: 90 },
  verifyTextCol: { flex: 1 },
  verifyTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#0f172a", marginBottom: 4 },
  verifyUrl: { fontSize: 8, color: "#0d9488", marginBottom: 4 },
  verifyHint: { fontSize: 8, color: "#64748b" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
  },
  valBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  valTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#7f1d1d",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  valRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  valLabel: { fontSize: 9, color: "#64748b" },
  valValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  valRatio: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 4 },
    disclaimer: { fontSize: 7, color: "#94a3b8", marginTop: 16, lineHeight: 1.4 },
});

function riskColors(label: string): { bg: string; text: string } {
  switch (label) {
    case "LOW": return { bg: "#16a34a", text: "#fff" };
    case "MEDIUM": return { bg: "#ca8a04", text: "#fff" };
    case "HIGH": return { bg: "#ea580c", text: "#fff" };
    case "CRITICAL": return { bg: "#dc2626", text: "#fff" };
    default: return { bg: "#64748b", text: "#fff" };
  }
}

function verdictStyle(verdict: string): { bg: string; color: string; label: string } {
  const v = (verdict || "").toUpperCase();
  if (v.includes("DO_NOT") || v.includes("STOP") || v.includes("BLOCK")) {
    return { bg: "#fef2f2", color: "#7f1d1d", label: "DO NOT PROCEED" };
  }
  if (v.includes("CAUTION") || v.includes("PROCEED_WITH")) {
    return { bg: "#fff7ed", color: "#9a3412", label: "PROCEED WITH CAUTION" };
  }
  if (v.includes("PROCEED") || v.includes("CLEAR")) {
    return { bg: "#ecfdf5", color: "#065f46", label: "PROCEED" };
  }
  return { bg: "#f8fafc", color: "#334155", label: verdict || "REVIEW" };
}

function PassportDocument({ data, qrDataUrl }: { data: PassportData; qrDataUrl: string | null }) {
  const colors = riskColors(data.riskLabel);
  const vs = verdictStyle(data.verdict);
  const scannedDisplay = data.scannedAt
    ? new Date(data.scannedAt).toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.brand }, "PakkaScan"),
          React.createElement(Text, { style: styles.brandSub }, "Property Passport — AI Due Diligence")
        ),
        React.createElement(
          View,
          { style: styles.meta },
          React.createElement(Text, { style: styles.metaBold }, data.referenceCode),
          React.createElement(Text, null, scannedDisplay),
          React.createElement(Text, null, data.reportType.replace(/_/g, " "))
        )
      ),

      // Risk Scorecard
      React.createElement(Text, { style: styles.sectionTitle }, "Transaction Risk Score"),
      React.createElement(
        View,
        { style: styles.scoreRow },
        React.createElement(
          View,
          { style: [styles.scoreBadge, { backgroundColor: colors.bg }] },
          React.createElement(Text, { style: styles.scoreNumber }, String(data.riskScore)),
          React.createElement(Text, { style: styles.scoreOutOf }, "/10")
        ),
        React.createElement(
          View,
          null,
          React.createElement(
            Text,
            { style: [styles.labelBadge, { backgroundColor: colors.bg }] },
            `${data.riskLabel} RISK`
          ),
          data.scoreBreakdown
            ? React.createElement(Text, { style: styles.breakdown }, data.scoreBreakdown)
            : null
        )
      ),
      data.riskFactors.length > 0
        ? React.createElement(
            View,
            { style: styles.factorList },
            ...data.riskFactors.map((f, i) =>
              React.createElement(
                View,
                { key: i, style: styles.factorItem },
                React.createElement(Text, { style: styles.factorBullet }, "•"),
                React.createElement(
                  Text,
                  { style: styles.factorText },
                  `${f.label} (${f.points > 0 ? "+" : ""}${f.points})`
                )
              )
            )
          )
        : React.createElement(Text, { style: styles.factorText }, "No risk factors detected."),

      // Verdict
      React.createElement(Text, { style: styles.sectionTitle }, "Verdict"),
      React.createElement(
        View,
        { style: [styles.verdictBox, { backgroundColor: vs.bg }] },
        React.createElement(Text, { style: [styles.verdictLabel, { color: vs.color }] }, vs.label),
        data.pakkaScore != null
          ? React.createElement(Text, { style: styles.verdictSub }, `PakkaScore: ${data.pakkaScore}/100`)
          : null
      ),

      // Official valuation (Session 7)
      data.valuation && data.valuation.officialValuePkr
        ? React.createElement(
            View,
            { style: styles.valBox },
            React.createElement(Text, { style: styles.valTitle }, "Official Valuation Check (DC / FBR)"),
            React.createElement(
              View,
              { style: styles.valRow },
              React.createElement(Text, { style: styles.valLabel }, "Declared price"),
              React.createElement(
                Text,
                { style: styles.valValue },
                `PKR ${Math.round(Number(data.valuation.declaredPricePkr || 0)).toLocaleString("en-PK")}`
              )
            ),
            React.createElement(
              View,
              { style: styles.valRow },
              React.createElement(Text, { style: styles.valLabel }, "Official benchmark"),
              React.createElement(
                Text,
                { style: styles.valValue },
                `PKR ${Math.round(Number(data.valuation.officialValuePkr)).toLocaleString("en-PK")}`
              )
            ),
            data.valuation.ratio != null
              ? React.createElement(
                  Text,
                  {
                    style: [
                      styles.valRatio,
                      {
                        color:
                          Number(data.valuation.ratio) < 0.5
                            ? "#7f1d1d"
                            : Number(data.valuation.ratio) < 0.8
                              ? "#92400e"
                              : "#065f46",
                      },
                    ],
                  },
                  `Ratio: ${(Number(data.valuation.ratio) * 100).toFixed(0)}% of benchmark` +
                    (Number(data.valuation.ratio) < 0.5
                      ? " — severe Section 111 exposure"
                      : Number(data.valuation.ratio) < 0.8
                        ? " — mild under-declaration"
                        : " — within normal range")
                )
              : null,
            data.valuation.matchLabel
              ? React.createElement(
                  Text,
                  { style: { fontSize: 8, color: "#64748b", marginTop: 4 } },
                  data.valuation.matchLabel
                )
              : null
          )
        : null,

      // Key Facts
      data.keyFacts && data.keyFacts.length > 0
        ? React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.sectionTitle }, "Key Facts"),
            React.createElement(
              View,
              { style: styles.factsGrid },
              ...data.keyFacts.slice(0, 6).map((fact, i) =>
                React.createElement(
                  View,
                  { key: i, style: styles.factCell },
                  React.createElement(Text, { style: styles.factLabel }, fact.label),
                  React.createElement(Text, { style: styles.factValue }, fact.value || "—")
                )
              )
            )
          )
        : null,

      // Verify row with QR
      React.createElement(
        View,
        { style: styles.verifyRow },
        qrDataUrl
          ? React.createElement(Image, { style: styles.qrImage, src: qrDataUrl })
          : null,
        React.createElement(
          View,
          { style: styles.verifyTextCol },
          React.createElement(Text, { style: styles.verifyTitle }, "Verify this report"),
          React.createElement(Text, { style: styles.verifyUrl }, data.verifyUrl),
          React.createElement(
            Text,
            { style: styles.verifyHint },
            "Scan the QR code or visit the URL to confirm this report was issued by PakkaScan. Public verification does not reveal document contents."
          )
        )
      ),

      // Disclaimer
      React.createElement(
        Text,
        { style: styles.disclaimer },
        "PakkaScan is an AI-powered assistive tool. This report is advisory and does not constitute certified legal counsel. Always confirm high-value transactions with a qualified property lawyer and the relevant authorities (NADRA, PLRA, Sub-Registrar)."
      ),

      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, "pakkascan.com"),
        React.createElement(Text, null, `Generated ${new Date().toISOString().slice(0, 10)}`)
      )
    )
  );
}

/**
 * Render a Property Passport PDF to a Buffer (Node.js).
 * Embeds a QR code pointing at the verify URL.
 */
export async function renderPassportPdf(data: PassportData): Promise<Buffer> {
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 180,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
  } catch (err) {
    console.warn("[pdf-passport] QR generation failed, continuing without QR:", err);
  }

  const doc = React.createElement(PassportDocument, { data, qrDataUrl });
  const buffer = await renderToBuffer(doc as any);
  return Buffer.from(buffer);
}
