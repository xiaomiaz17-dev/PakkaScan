import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";


export const metadata: Metadata = {
  title: "Features",
  description: "Deterministic rules, immutable evidence, customer isolation, review queue, and explainable scores.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>Features</h1>
        <p className="muted">Deterministic rules, immutable evidence, customer isolation, review queue, and explainable scores.</p>
        <p className="muted">This page is part of the commercial launch surface and will deepen with product content.</p>
      </div>
    </MarketingShell>
  );
}
