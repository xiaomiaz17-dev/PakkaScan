"use client";

/**
 * Official DC/FBR benchmark vs declared price (Session 7 surface).
 * Silent when valuationComparison is null/empty — no false positives.
 */
export type ValuationComparison = {
  declaredPricePkr?: number | null;
  officialValuePkr?: number | null;
  ratio?: number | null;
  confidence?: string | null;
  match?: {
    city?: string;
    area?: string;
    phase_or_block?: string | null;
    category?: string;
    source_type?: string;
    effective_date?: string | null;
  } | null;
  matchReason?: string;
};

function fmtPkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString("en-PK")}`;
}

export function ValuationComparisonCard({ data }: { data: ValuationComparison | null | undefined }) {
  if (!data?.officialValuePkr || data.officialValuePkr <= 0) return null;

  const declared = data.declaredPricePkr ?? 0;
  const official = Number(data.officialValuePkr);
  const ratio = data.ratio != null ? Number(data.ratio) : declared > 0 ? declared / official : null;

  const ratioColor =
    ratio == null ? "#64748b" : ratio < 0.5 ? "#7f1d1d" : ratio < 0.8 ? "#92400e" : "#065f46";
  const ratioBg =
    ratio == null ? "#f8fafc" : ratio < 0.5 ? "#fef2f2" : ratio < 0.8 ? "#fffbeb" : "#ecfdf5";
  const ratioBorder =
    ratio == null ? "#e2e8f0" : ratio < 0.5 ? "#fecaca" : ratio < 0.8 ? "#fde68a" : "#a7f3d0";

  const ratioLabel =
    ratio == null
      ? null
      : ratio < 0.5
        ? " — severe Section 111 exposure"
        : ratio < 0.8
          ? " — mild under-declaration"
          : " — within normal range";

  return (
    <div
      style={{
        marginTop: 16,
        marginBottom: 8,
        padding: 16,
        borderRadius: 12,
        border: `1px solid ${ratioBorder}`,
        background: ratioBg,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          color: "#64748b",
          marginBottom: 10,
          textTransform: "uppercase",
        }}
      >
        Official Valuation Check (DC / FBR Benchmark)
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          fontSize: 13,
        }}
      >
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>Declared price</div>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{fmtPkr(declared)}</div>
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>Official benchmark</div>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{fmtPkr(official)}</div>
        </div>
      </div>
      {ratio != null && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: ratioColor }}>
          Ratio: {(ratio * 100).toFixed(0)}% of benchmark{ratioLabel}
        </div>
      )}
      {data.match && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
          Matched: {data.match.city}
          {data.match.area ? ` / ${data.match.area}` : ""}
          {data.match.phase_or_block ? ` / ${data.match.phase_or_block}` : ""}
          {data.confidence ? ` (${data.confidence} confidence)` : ""}
          {data.match.source_type ? ` · source: ${data.match.source_type}` : ""}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 10, color: "#94a3b8", lineHeight: 1.4 }}>
        Benchmark from published FBR valuation tables. Not a formal tax assessment — confirm with a
        tax advisor for Section 111 exposure.
      </div>
    </div>
  );
}
