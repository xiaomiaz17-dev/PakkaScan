import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";
import { SITE } from "@/content/site";

export const metadata: Metadata = {
  title: "Press kit",
  description: "Brand and product description for press.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>Press kit</h1>
        <p>
          <strong>Brand:</strong> {SITE.name}
        </p>
        <p>
          <strong>Former engineering name:</strong> {SITE.formerName}
        </p>
        <p>
          <strong>Tagline:</strong> {SITE.tagline}
        </p>
        <p className="muted">{SITE.description}</p>
        <p className="muted">Logo assets: placeholder until design system export. Contact {SITE.supportEmail}.</p>
      </div>
    </MarketingShell>
  );
}
