"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, publicErrorMessage } from "@/client/api";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: String(form.get("email") ?? ""),
        displayName: String(form.get("displayName") ?? ""),
        password: String(form.get("password") ?? ""),
      }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(publicErrorMessage(result.error));
      return;
    }
    router.push("/onboarding");
  }

  return (
    <div className="auth-card">
      <Link href="/" className="brand">
        PakkaScan
      </Link>
      <section className="panel" aria-labelledby="register-title" style={{ marginTop: 16 }}>
        <h1 id="register-title">Create account</h1>
        <p className="muted">Closed beta access for Pakistani property due diligence.</p>
        <form className="stack" onSubmit={onSubmit}>
          <label htmlFor="displayName">
            Full name
            <input id="displayName" name="displayName" type="text" autoComplete="name" required />
          </label>
          <label htmlFor="email">
            Email
            <input id="email" name="email" type="email" autoComplete="email" required />
          </label>
          <label htmlFor="password">
            Password
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
          </label>
          {error ? (
            <div className="banner failed" role="alert">
              {error}
            </div>
          ) : null}
          <div className="form-actions">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </button>
            <Link href="/login">Already registered?</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
