"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, publicErrorMessage } from "@/client/api";

const STEPS = [
  { id: "welcome", title: "Welcome to PakkaScan", body: "Evidence-first analysis for Pakistani property documents." },
  { id: "property", title: "Create or try a sample", body: "Start with a real property or load a demo pack." },
  { id: "upload", title: "Upload documents", body: "Fard, mutation, and supporting IDs improve coverage." },
  { id: "report", title: "Review report & Passport", body: "Findings stay linked to evidence; low confidence is never silent." },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const current = STEPS[step]!;
  const percent = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

  async function loadSample() {
    setLoading(true);
    setError(null);
    const result = await apiFetch<{ propertyId: string }>("/api/onboarding/sample", {
      method: "POST",
      csrf: true,
      body: JSON.stringify({}),
    });
    setLoading(false);
    if (!result.ok) {
      if (result.status === 401) {
        router.replace("/login");
        return;
      }
      setError(publicErrorMessage(result.error));
      return;
    }
    router.push(`/properties/${result.data.propertyId}/status`);
  }

  return (
    <div className="stack" style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px" }}>
      <header className="topbar">
        <Link href="/dashboard" className="brand">
          PakkaScan
        </Link>
      </header>
      <section className="panel">
        <small className="muted">
          Step {step + 1} of {STEPS.length}
        </small>
        <div className="progress" aria-label="Onboarding progress">
          <span style={{ width: `${percent}%` }} />
        </div>
        <h1>{current.title}</h1>
        <p className="muted">{current.body}</p>
        {error ? (
          <div className="banner failed" role="alert">
            {error}
          </div>
        ) : null}
        <div className="form-actions">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button className="primary" type="button" onClick={() => setStep((s) => s + 1)}>
              Continue
            </button>
          ) : (
            <Link className="button primary" href="/dashboard">
              Go to dashboard
            </Link>
          )}
          {current.id === "property" ? (
            <button type="button" className="button" disabled={loading} onClick={() => void loadSample()}>
              {loading ? "Loading sample…" : "Load sample property"}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
