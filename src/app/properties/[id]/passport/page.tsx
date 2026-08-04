"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, publicErrorMessage } from "@/client/api";

export default function PassportPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [passport, setPassport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetch(`/api/properties/${id}/passport`);
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401) router.replace("/login");
        else setError(publicErrorMessage(result.error));
        setLoading(false);
        return;
      }
      setPassport(result.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <div className="stack" style={{ maxWidth: 720, margin: "0 auto" }}>
      <header className="topbar">
        <Link href={`/properties/${id}`}>← Property</Link>
      </header>
      {loading ? <section className="banner loading">Loading Passport…</section> : null}
      {error ? (
        <section className="banner failed" role="alert">
          {error}
        </section>
      ) : null}
      {passport ? (
        <section className="panel" aria-labelledby="passport-title">
          <h1 id="passport-title">Property Passport</h1>
          <p className="muted">Permanent summary for property {id}.</p>
          <dl>
            <dt>Public ID</dt>
            <dd>{passport.publicId ?? "—"}</dd>
            <dt>Latest verification</dt>
            <dd>{passport.latestVerificationId ?? passport.reports?.[0]?.verificationId ?? "—"}</dd>
          </dl>
          <div className="form-actions">
            <Link className="button" href={`/properties/${id}/report`}>
              Back to report
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
