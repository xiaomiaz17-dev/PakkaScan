"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { apiFetch, publicErrorMessage } from "@/client/api";

type Property = { id: string; label: string; status: string };

export default function DashboardPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    let cancelled = false;
    (async () => {
      const result = await apiFetch<{ properties: Property[] }>("/api/properties");
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        if (result.status === 401) {
          router.replace("/login");
          return;
        }
        setError(publicErrorMessage(result, "Failed to load properties"));
        return;
      }
      setProperties(result.data.properties || []);
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (!isMounted) return null; // Prevents server-side prerender evaluation crash

  return (
    <AppShell>
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px' }}>Dashboard</h1>
        {loading && <p>Loading properties...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && !error && (
          <div>
            {properties.length === 0 ? (
              <p>No properties found.</p>
            ) : (
              <ul>
                {properties.map((p) => (
                  <li key={p.id}>{p.label} - {p.status}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}