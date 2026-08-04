"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, publicErrorMessage } from "@/client/api";

type Status = {
  propertyId: string;
  status: string;
  documentCount: number;
  reportReady: boolean;
  passportReady: boolean;
  missingDocuments: string[];
};

export default function StatusPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const result = await apiFetch<Status>(`/api/properties/${id}/status`);
    setLoading(false);
    if (!result.ok) {
      if (result.status === 401) {
        router.replace("/login");
        return;
      }
      setError(publicErrorMessage(result.error));
      return;
    }
    setError(null);
    setData(result.data);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const progress = data
    ? data.reportReady
      ? 100
      : data.documentCount === 0
        ? 10
        : data.status === "PROCESSING"
          ? 65
          : 40
    : 0;

  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <header className="topbar">
        <Link href={`/properties/${id}`}>← Property</Link>
      </header>
      <section className="panel" aria-labelledby="status-title">
        <h1 id="status-title">Processing status</h1>
        {loading ? <p className="muted">Refreshing…</p> : null}
        {error ? (
          <div className="banner failed" role="alert">
            {error}
          </div>
        ) : null}
        {data ? (
          <>
            <p>
              <span
                className={`status-pill ${
                  data.reportReady ? "ready" : data.status === "FAILED" ? "failed" : "processing"
                }`}
              >
                {data.reportReady ? "Report ready" : data.status}
              </span>
            </p>
            <div className="progress" aria-label="Processing progress">
              <span style={{ width: `${progress}%` }} />
            </div>
            <ul>
              <li>Documents uploaded: {data.documentCount}</li>
              <li>Report ready: {data.reportReady ? "yes" : "no"}</li>
              <li>Passport ready: {data.passportReady ? "yes" : "no"}</li>
            </ul>
            {data.missingDocuments.length > 0 ? (
              <section className="banner failed" role="status">
                <strong>Missing documents</strong>
                <p className="muted">{data.missingDocuments.join(", ")}</p>
              </section>
            ) : null}
            {!data.reportReady && data.documentCount > 0 ? (
              <section className="banner loading" role="status">
                <strong>Review may be required</strong>
                <p className="muted">Low-confidence fields are never silently accepted.</p>
              </section>
            ) : null}
            {data.reportReady ? (
              <section className="banner" role="status">
                <strong>Report ready</strong>
                <p className="muted">Your PakkaScore report and Property Passport are available.</p>
              </section>
            ) : null}
          </>
        ) : null}
        <div className="form-actions">
          <button type="button" className="button" onClick={() => void load()}>
            Refresh status
          </button>
          <Link className="button" href={`/properties/${id}/report`}>
            Open report
          </Link>
          <Link className="button" href={`/properties/${id}/passport`}>
            Open Passport
          </Link>
        </div>
      </section>
    </div>
  );
}
