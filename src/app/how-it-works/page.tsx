import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";


export const metadata: Metadata = {
  title: "How it works",
  description: "Upload documents, run evidence-linked analysis, receive a PakkaScore report and Property Passport.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>How it works</h1>
        <p className="muted">Upload documents, run evidence-linked analysis, receive a PakkaScore report and Property Passport.</p>
        <p className="muted">This page is part of the commercial launch surface and will deepen with product content.</p>
      </div>
    </MarketingShell>
  );
}
