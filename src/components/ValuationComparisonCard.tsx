"use client";
/**
 * Official DC/FBR benchmark vs declared price.
 * Silent when valuationComparison is null/empty — no invented benchmarks.
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

  const declared = Number(data.declaredPricePkr ?? 0);
  const official = Number(data.officialValuePkr);
  const ratio =
    data.ratio != null ? Number(data.ratio) : declared > 0 ? declared / official : null;
  const gap = official > 0 && declared >= 0 ? Math.max(0, official - declared) : null;

  const severity: "severe" | "mild" | "ok" | "unknown" =
    ratio == null ? "unknown" : ratio < 0.5 ? "severe" : ratio < 0.8 ? "mild" : "ok";

  const ratioColor =
    severity === "severe" ? "#7f1d1d" : severity === "mild" ? "#92400e" : severity === "ok" ? "#065f46" : "#64748b";
  const ratioBg =
    severity === "severe" ? "#fef2f2" : severity === "mild" ? "#fffbeb" : severity === "ok" ? "#ecfdf5" : "#f8fafc";
  const ratioBorder =
    severity === "severe" ? "#fecaca" : severity === "mild" ? "#fde68a" : severity === "ok" ? "#a7f3d0" : "#e2e8f0";

  const exposureTitle =
    severity === "severe"
      ? "High unexplained-income attention (illustrative)"
      : severity === "mild"
        ? "Possible under-declaration — verify before registry"
        : severity === "ok"
          ? "Declared value within normal range of benchmark"
          : "Benchmark available";

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
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        Tax &amp; valuation exposure (DC / FBR)
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: ratioColor, marginBottom: 12 }}>{exposureTitle}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>Declared sale value</div>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{declared > 0 ? fmtPkr(declared) : "Not found in extract"}</div>
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>DC / FBR reference</div>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{fmtPkr(official)}</div>
        </div>
        {gap != null && declared > 0 && (
          <div>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>Gap (reference − declared)</div>
            <div style={{ fontWeight: 800, color: ratioColor }}>{fmtPkr(gap)}</div>
          </div>
        )}
        {ratio != null && (
          <div>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>Declared as % of benchmark</div>
            <div style={{ fontWeight: 800, color: ratioColor }}>{(ratio * 100).toFixed(0)}%</div>
          </div>
        )}
      </div>

      {severity === "severe" || severity === "mild" ? (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.65)",
            border: `1px solid ${ratioBorder}`,
            fontSize: 12,
            color: "#334155",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: ratioColor, marginBottom: 4 }}>Illustrative Section 111 attention</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              Gap treated as possible unexplained-income attention:{" "}
              <strong>{gap != null && declared > 0 ? fmtPkr(gap) : "see ratio"}</strong>
            </li>
            <li>Withholding (e.g. 236C / 236K) may not match registry economics — flag for tax advisor review</li>
            <li>Not a calculation of tax due. FBR rules and facts of the deal control.</li>
          </ul>
        </div>
      ) : null}

      {data.match && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
          Matched: {data.match.city}
          {data.match.area ? ` / ${data.match.area}` : ""}
          {data.match.phase_or_block ? ` / ${data.match.phase_or_block}` : ""}
          {data.confidence ? ` (${data.confidence} confidence)` : ""}
          {data.match.source_type ? ` · source: ${data.match.source_type}` : ""}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 10, color: "#94a3b8", lineHeight: 1.4 }}>
        Benchmark from published FBR / DC-style tables when a confident match exists. Silent when unknown.
        Illustrative only — not a formal tax assessment or legal advice.
      </div>
    </div>
  );
}
