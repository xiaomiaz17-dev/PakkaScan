"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { apiFetch, publicErrorMessage } from "@/client/api";

type Property = { id: string; label: string; status: string };

export default function DashboardPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetch<{ properties: Property[] }>("/api/properties");
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401) {
          router.replace("/login");
          return;
        }
        setError(publicErrorMessage(result.error));
        setLoading(false);
        return;
      }
      setProperties(result.data.properties ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <AppShell title="Dashboard">
      <p className="muted">Your properties, processing status, and reports.</p>
      {loading ? <section className="banner loading">Loading workspace…</section> : null}
      {error ? (
        <section className="banner failed" role="alert">
          {error}
        </section>
      ) : null}
      {!loading && properties.length === 0 ? (
        <section className="empty">
          <h2>No properties yet</h2>
          <p className="muted">Create a property or load the sample pack from onboarding.</p>
          <div className="form-actions">
            <Link className="button primary" href="/properties/new">
              Create property
            </Link>
            <Link className="button" href="/onboarding">
              Guided onboarding
            </Link>
          </div>
        </section>
      ) : null}
      <div className="propertyList" role="list">
        {properties.map((p) => (
          <article className="property" role="listitem" key={p.id}>
            <div>
              <strong>
                <Link href={`/properties/${p.id}`}>{p.label}</Link>
              </strong>
              <p>
                <span className={`status-pill ${statusClass(p.status)}`}>{p.status}</span>
              </p>
            </div>
            <div className="form-actions">
              <Link className="button" href={`/properties/${p.id}/status`}>
                Status
              </Link>
              <Link className="button" href={`/properties/${p.id}/report`}>
                Report
              </Link>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}

function statusClass(status: string): string {
  if (status === "REPORT_READY") return "ready";
  if (status === "FAILED") return "failed";
  if (status === "PROCESSING" || status === "UPLOADING") return "processing";
  return "missing";
}
