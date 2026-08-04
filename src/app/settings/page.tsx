"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <p className="muted">Workspace preferences. Notification delivery channels require ESP credentials.</p>
      <section className="panel stack">
        <h2>Notifications</h2>
        <label>
          <input type="checkbox" defaultChecked disabled /> Email when report is ready (coming soon)
        </label>
        <label>
          <input type="checkbox" defaultChecked disabled /> Product updates (coming soon)
        </label>
        <p className="muted small">Toggles are visible for UX completeness; outbound email is NOT_EXECUTED without ESP keys.</p>
      </section>
      <section className="panel stack">
        <h2>Security</h2>
        <p className="muted">Password change and session management will use the authenticated API once mail delivery is configured.</p>
        <Link className="button" href="/account">
          Back to account
        </Link>
      </section>
    </AppShell>
  );
}
