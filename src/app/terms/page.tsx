import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";


export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Commercial terms for using PakkaScan.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>Terms of Service</h1>
        <p className="muted">Commercial terms for using PakkaScan.</p>
        <p className="muted">This page is part of the commercial launch surface and will deepen with product content.</p>
      </div>
    </MarketingShell>
  );
}
