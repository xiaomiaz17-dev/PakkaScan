"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, publicErrorMessage } from "@/client/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(publicErrorMessage(result.error));
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="auth-card">
      <Link href="/" className="brand">
        PakkaScan
      </Link>
      <section className="panel" aria-labelledby="login-title" style={{ marginTop: 16 }}>
        <h1 id="login-title">Sign in</h1>
        <p className="muted">Access your properties, status and reports.</p>
        <form className="stack" onSubmit={onSubmit}>
          <label htmlFor="email">
            Email
            <input id="email" name="email" type="email" autoComplete="email" required />
          </label>
          <label htmlFor="password">
            Password
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </label>
          {error ? (
            <div className="banner failed" role="alert">
              {error}
            </div>
          ) : null}
          <div className="form-actions">
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <Link href="/register">Create account</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
