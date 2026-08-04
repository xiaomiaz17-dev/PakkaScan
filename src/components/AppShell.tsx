"use client";

import Link from "next/link";
import BrandMark from "@/components/BrandMark";s
import { useRouter } from "next/navigation";
import { apiFetch } from "@/client/api";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST", csrf: true });
    router.replace("/login");
  }
  return (
    <div className="app-frame">
      <header className="topbar">
        <Link href="/dashboard" className="brand">
          <BrandMark size={26} />
          <span>PakkaScan</span>
        </Link>
        <nav className="nav" aria-label="App">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/properties">Properties</Link>
          <Link href="/onboarding">Onboarding</Link>
          <Link href="/account">Account</Link>
          <Link href="/help">Help</Link>
          <button type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </nav>
      </header>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  );
}
