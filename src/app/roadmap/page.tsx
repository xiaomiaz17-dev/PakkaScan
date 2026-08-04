import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";


export const metadata: Metadata = {
  title: "Roadmap",
  description: "Phase 1 complete in software; Phase 2 expands intelligence and commercial SaaS.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>Roadmap</h1>
        <p className="muted">Phase 1 complete in software; Phase 2 expands intelligence and commercial SaaS.</p>
        <p className="muted">This page is part of the commercial launch surface and will deepen with product content.</p>
      </div>
    </MarketingShell>
  );
}
