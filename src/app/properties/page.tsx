"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, publicErrorMessage } from "@/client/api";

type Property = {
  id: string;
  label: string;
  status: string;
  jurisdiction?: string;
};

export default function PropertiesPage() {
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

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST", csrf: true });
    router.replace("/login");
  }

  return (
    <div className="stack">
      <header className="topbar">
        <Link href="/" className="brand">
          PakkaScan
        </Link>
        <nav className="nav" aria-label="Workspace">
          <Link href="/properties">Properties</Link>
          <button type="button" onClick={logout}>
            Sign out
          </button>
        </nav>
      </header>
      <div className="sectionHead">
        <div>
          <small className="muted">WORKSPACE</small>
          <h1>Properties</h1>
        </div>
        <Link className="button primary" href="/properties/new">
          Create property
        </Link>
      </div>
      {loading ? (
        <section className="banner loading" role="status">
          Loading properties…
        </section>
      ) : null}
      {error ? (
        <section className="banner failed" role="alert">
          {error}
        </section>
      ) : null}
      {!loading && !error && properties.length === 0 ? (
        <section className="empty" aria-label="Empty state">
          <h2>No properties yet</h2>
          <p className="muted">Create a property to start the guided upload and PakkaScore journey.</p>
          <Link className="button primary" href="/properties/new">
            Create your first property
          </Link>
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
              <Link className="button" href={`/properties/${p.id}/upload`}>
                Upload
              </Link>
              <Link className="button" href={`/properties/${p.id}/status`}>
                Status
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function statusClass(status: string): string {
  if (status === "REPORT_READY") return "ready";
  if (status === "FAILED") return "failed";
  if (status === "PROCESSING" || status === "UPLOADING") return "processing";
  return "missing";
}
