"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, publicErrorMessage } from "@/client/api";

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetch<{ property: { label: string; status: string } }>(`/api/properties/${id}`);
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401) router.replace("/login");
        else if (result.status === 403) setError(publicErrorMessage("FORBIDDEN"));
        else setError(publicErrorMessage(result.error));
        setLoading(false);
        return;
      }
      setLabel(result.data.property.label);
      setStatus(result.data.property.status);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <div className="stack">
      <header className="topbar">
        <Link href="/properties">← Properties</Link>
      </header>
      {loading ? <section className="banner loading">Loading property…</section> : null}
      {error ? (
        <section className="banner failed" role="alert">
          {error}
        </section>
      ) : null}
      {!loading && !error ? (
        <section className="panel">
          <span className="badge">{id}</span>
          <h1>{label}</h1>
          <p>
            <span className="status-pill">{status}</span>
          </p>
          <div className="form-actions">
            <Link className="button primary" href={`/properties/${id}/upload`}>
              Upload documents
            </Link>
            <Link className="button" href={`/properties/${id}/status`}>
              Processing status
            </Link>
            <Link className="button" href={`/properties/${id}/report`}>
              Report
            </Link>
            <Link className="button" href={`/properties/${id}/passport`}>
              Passport
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
