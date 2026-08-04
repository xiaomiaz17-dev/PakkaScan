import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";


export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Essential and optional cookies used on this site.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>Cookie Policy</h1>
        <p className="muted">Essential and optional cookies used on this site.</p>
        <p className="muted">This page is part of the commercial launch surface and will deepen with product content.</p>
      </div>
    </MarketingShell>
  );
}
