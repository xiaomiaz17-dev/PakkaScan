import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";


export const metadata: Metadata = {
  title: "Property Passport",
  description: "A permanent, hash-backed summary of the latest verified analysis for a property.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>Property Passport</h1>
        <p className="muted">A permanent, hash-backed summary of the latest verified analysis for a property.</p>
        <p className="muted">This page is part of the commercial launch surface and will deepen with product content.</p>
      </div>
    </MarketingShell>
  );
}
