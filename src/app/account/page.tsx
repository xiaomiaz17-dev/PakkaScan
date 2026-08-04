"use client";

export const dynamic = 'force-dynamic';

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
      setUser(result.data.user || null);
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Rest of your component code...
}