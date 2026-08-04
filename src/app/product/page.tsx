import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Product",
  description: "PakkaScan product overview — analysis, findings, Property Passport.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>Product</h1>
        <p className="muted">
          PakkaScan turns property document packs into an explainable PakkaScore, evidence-linked findings, and a
          permanent Property Passport.
        </p>
        <ul>
          <li>
            <Link href="/how-it-works">How it works</Link>
          </li>
          <li>
            <Link href="/features">Features</Link>
          </li>
          <li>
            <Link href="/property-passport">Property Passport</Link>
          </li>
          <li>
            <Link href="/security">Security</Link>
          </li>
        </ul>
      </div>
    </MarketingShell>
  );
}
