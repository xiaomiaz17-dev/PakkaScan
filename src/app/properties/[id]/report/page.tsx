"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, publicErrorMessage } from "@/client/api";
import { ReportPostureStrip } from "@/components/ReportPostureStrip";

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetch(`/api/properties/${id}/report`);
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401) router.replace("/login");
        else setError(publicErrorMessage(result.error));
        setLoading(false);
        return;
      }
      setReport(result.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const score = report?.pakkaScore ?? report?.score;
  const findings = Array.isArray(report?.findings) ? report.findings : [];

  return (
    <div className="stack">
      <header className="topbar">
        <Link href={`/properties/${id}`}>← Property</Link>
      </header>
      {loading ? <section className="banner loading">Loading report…</section> : null}
      {error ? (
        <section className="banner failed" role="alert">
          {error}
        </section>
      ) : null}
      {report ? (
        <section className="panel" aria-labelledby="report-title">
          <span className="status-pill ready">Report ready</span>
          <h1 id="report-title">PakkaScore report</h1>
          <p className="muted">Verification ID: {report.verificationId}</p>
          <ReportPostureStrip
            pakkaScore={typeof score === "number" ? score : null}
            decision={report.decision}
            posture={report.posture}
            blockers={report.blockers}
            findingCount={findings.length}
          />
          <div className="grid">
            <article className="card">
              <small className="muted">PakkaScore</small>
              <h2>{score ?? "—"}</h2>
            </article>
            <article className="card">
              <small className="muted">Findings</small>
              <h2>{findings.length}</h2>
            </article>
          </div>
          {findings.length ? (
            <>
              <h2>Findings</h2>
              <ul>
                {findings.map((f: any, i: number) => (
                  <li key={i}>
                    {typeof f === "string" ? f : f.title || f.summary || JSON.stringify(f)}
                    {f?.evidenceIds?.length ? (
                      <span className="muted small"> · evidence {f.evidenceIds.join(", ")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <div className="form-actions">
            <Link className="button primary" href={`/properties/${id}/passport`}>
              Open Property Passport
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
