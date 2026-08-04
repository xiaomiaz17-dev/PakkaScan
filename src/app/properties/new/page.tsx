"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, publicErrorMessage } from "@/client/api";

export default function NewPropertyPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await apiFetch<{ id: string }>("/api/properties", {
      method: "POST",
      csrf: true,
      body: JSON.stringify({
        label: String(form.get("label") ?? ""),
        jurisdiction: String(form.get("jurisdiction") ?? "PUNJAB"),
      }),
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
    router.push(`/properties/${result.data.id}/upload`);
  }

  return (
    <div className="stack" style={{ maxWidth: 640, margin: "0 auto" }}>
      <header className="topbar">
        <Link href="/properties" className="brand">
          ← Properties
        </Link>
      </header>
      <section className="panel" aria-labelledby="create-title">
        <h1 id="create-title">Create property</h1>
        <form className="stack" onSubmit={onSubmit}>
          <label htmlFor="label">
            Property label
            <input id="label" name="label" required placeholder="Khasra 12/4 — Rawalpindi" />
          </label>
          <label htmlFor="jurisdiction">
            Jurisdiction
            <select id="jurisdiction" name="jurisdiction" required defaultValue="PUNJAB">
              <option value="PUNJAB">Punjab</option>
              <option value="SINDH">Sindh</option>
              <option value="KP">Khyber Pakhtunkhwa</option>
              <option value="BALOCHISTAN">Balochistan</option>
              <option value="ISLAMABAD">Islamabad</option>
            </select>
          </label>
          {error ? (
            <div className="banner failed" role="alert">
              {error}
            </div>
          ) : null}
          <div className="form-actions">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save property"}
            </button>
            <Link href="/properties">Cancel</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
