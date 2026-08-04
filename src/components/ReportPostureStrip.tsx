/**
 * Phase 2 — traffic-light posture strip for reports (web).
 * Green reserved for Pass status; brand blue stays elsewhere.
 */

export type ReportPostureStripProps = {
  pakkaScore: number | null | undefined;
  decision?: string | null;
  posture?: "CLEAR" | "PROCEED_WITH_CAUTION" | "BLOCKER_REVIEW" | string | null;
  blockers?: number;
  findingCount?: number;
};

function toneFrom(score: number | null | undefined, decision?: string | null, posture?: string | null) {
  const d = (decision ?? "").toUpperCase();
  const p = (posture ?? "").toUpperCase();
  if (d.includes("DO_NOT") || p.includes("BLOCKER") || (typeof score === "number" && score < 50)) {
    return "fail" as const;
  }
  if (
    d.includes("CAUTION") ||
    d.includes("REVIEW") ||
    d.includes("INCONCLUSIVE") ||
    p.includes("CAUTION") ||
    (typeof score === "number" && score < 80)
  ) {
    return "warn" as const;
  }
  if (typeof score === "number" && score >= 80) return "pass" as const;
  return "warn" as const;
}

function labelFor(tone: "pass" | "warn" | "fail") {
  if (tone === "pass") return "Pass";
  if (tone === "warn") return "Caution";
  return "Fail";
}

export function ReportPostureStrip(props: ReportPostureStripProps) {
  const tone = toneFrom(props.pakkaScore, props.decision, props.posture);
  const score =
    props.pakkaScore === null || props.pakkaScore === undefined ? "—" : String(props.pakkaScore);

  return (
    <div className={`posture-strip posture-${tone}`} role="status" aria-label="Analysis posture">
      <div className="posture-strip-main">
        <span className={`status-pill ${tone}`}>{labelFor(tone)}</span>
        <strong className="posture-score">PakkaScore {score}</strong>
        {props.decision ? <span className="muted small posture-decision">{props.decision}</span> : null}
      </div>
      <div className="posture-strip-meta muted small">
        {typeof props.blockers === "number" ? <span>{props.blockers} blocker(s)</span> : null}
        {typeof props.findingCount === "number" ? <span>{props.findingCount} finding(s)</span> : null}
        <span>Decision-support only — not legal advice</span>
      </div>
    </div>
  );
}
