"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { apiFetch, publicErrorMessage } from "@/client/api";

type SessionUser = { id?: string; email?: string; displayName?: string };

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await apiFetch<{ authenticated: boolean; user?: SessionUser }>("/api/auth/session");
      if (cancelled) return;
      if (!result.ok || !result.data.authenticated) {
        router.replace("/login");
        return;
      }
      setUser(result.data.user ?? {});
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <AppShell title="Account">
      <p className="muted">Profile and plan overview for your PakkaScan workspace.</p>
      {error ? (
        <div className="banner failed" role="alert">
          {error}
        </div>
      ) : null}
      <section className="panel stack">
        <h2>Profile</h2>
        <p>
          <strong>Name:</strong> {user?.displayName ?? "—"}
        </p>
        <p>
          <strong>Email:</strong> {user?.email ?? "—"}
        </p>
        <div className="form-actions">
          <Link className="button" href="/settings">
            Settings
          </Link>
          <Link className="button" href="/pricing">
            Plans & billing
          </Link>
        </div>
      </section>
      <section className="card">
        <h2>Plan</h2>
        <p className="muted">
          Plan state is enforced at analysis time. Live Stripe checkout remains blocked until payment credentials are
          provided by the founder.
        </p>
        <Link href="/api/billing/status">View billing status API</Link>
      </section>
    </AppShell>
  );
}
