import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Why PakkaScan",
  description: "Trust, explainability, and commercial due diligence — not opaque scores.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>Why PakkaScan</h1>
        <p className="muted">
          PakkaScan exists to make Pakistani property due diligence evidence-first: deterministic rules, immutable
          evidence links, and a Property Passport you can revisit — without inventing ownership or legal conclusions.
        </p>
        <p className="muted">
          Formerly known as PakkaDeed in engineering milestones, the commercial product is PakkaScan. Core concepts such
          as Property Passport and the verification engine keep their established names.
        </p>
      </div>
    </MarketingShell>
  );
}
