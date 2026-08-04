import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Security — how PakkaScan protects property documents",
  description:
    "Encryption at rest and in transit, customer isolation, CNIC handling, retention, and operational honesty for Pakistani property due diligence.",
};

export default function SecurityPage() {
  return (
    <MarketingShell>
      <div className="shell prose">
        <h1>Security</h1>
        <p className="lead muted">
          PakkaScan is built for documents that identify people and ownership. The controls below are product commitments for
          closed beta — not marketing filler.
        </p>

        <section>
          <h2>Encryption</h2>
          <ul>
            <li>
              <strong>In transit:</strong> TLS on public endpoints in production deployments.
            </li>
            <li>
              <strong>At rest:</strong> application-level AES-256-GCM for durable document blobs where the storage secret is
              configured; object storage uses private buckets (no public ACLs).
            </li>
            <li>
              <strong>Evidence integrity:</strong> SHA-256 content hashes bind findings to immutable evidence records.
            </li>
          </ul>
        </section>

        <section>
          <h2>Customer isolation</h2>
          <ul>
            <li>Properties, documents, jobs, reports and Passports are scoped to the authenticated account.</li>
            <li>API and browser journey tests reject cross-customer access (customer B cannot read customer A).</li>
            <li>Workers process jobs under repository isolation — not a shared global document pool.</li>
          </ul>
        </section>

        <section>
          <h2>CNIC and personal identifiers</h2>
          <ul>
            <li>
              <strong>Extraction:</strong> CNIC may appear as a structured field when present on a document for matching
              checks.
            </li>
            <li>
              <strong>Display:</strong> customer UI defaults to masked CNIC (e.g. •••••-•••••••-•) outside secured review
              contexts.
            </li>
            <li>
              <strong>Logs:</strong> structured logs redact CNIC-like patterns; secrets are never written to probe history.
            </li>
            <li>
              <strong>Retention:</strong> closed-beta default — document binaries and derived structured PII retained only
              while the property case is active, then deleted on account deletion or explicit purge request. Beta retention
              target: ≤ 90 days after last activity unless the customer exports and asks to keep a Passport hash record.
            </li>
            <li>
              <strong>Sale of data:</strong> PakkaScan does not sell customer documents or extracted identity fields.
            </li>
          </ul>
          <p className="muted small">
            Full legal wording lives in the <Link href="/privacy">Privacy Policy</Link>. Operational detail:{" "}
            <code>docs/CNIC_AND_PII_POLICY.md</code>.
          </p>
        </section>

        <section>
          <h2>Access and least privilege</h2>
          <ul>
            <li>Session cookies are HttpOnly, Secure (production), SameSite; CSRF on state-changing routes.</li>
            <li>Staging secrets via env files — not committed credentials.</li>
            <li>No institutional multi-tenant admin console in Phase 1 (single-buyer / agent accounts only).</li>
          </ul>
        </section>

        <section>
          <h2>Honest operational status</h2>
          <ul>
            <li>
              Live multi-region uptime and 24-hour soak are only claimed when measured — see{" "}
              <Link href="/status">Status</Link>.
            </li>
            <li>
              You can independently check a shared report hash via <Link href="/verify">Verify</Link>.
            </li>
          </ul>
        </section>

        <p>
          <Link className="button power" href="/sample-report">
            View sample audit report
          </Link>{" "}
          <Link className="button secondary" href="/contact">
            Contact security questions
          </Link>
        </p>
      </div>
    </MarketingShell>
  );
}
