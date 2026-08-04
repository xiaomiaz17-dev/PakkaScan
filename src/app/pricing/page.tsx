import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";
import { PRICING_PLANS } from "@/content/site";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Explore free, buy professional reports, or talk to us about team workspaces.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>Pricing</h1>
        <p className="muted">Explore free, buy professional reports, or talk to us about team workspaces.</p>
        
        <div className="pricing-grid" style={{ maxWidth: 960 }}>
          {PRICING_PLANS.map((plan) => (
            <article key={plan.id} className={`card pricing-card ${plan.highlighted ? "highlighted" : ""}`}>
              <h2>{plan.name}</h2>
              <p><strong style={{ fontSize: "1.4rem" }}>{plan.price}</strong> <span className="muted">{plan.period}</span></p>
              <p className="muted">{plan.blurb}</p>
              <ul>{plan.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <a className={`button ${plan.highlighted ? "primary" : ""}`} href={plan.href}>{plan.cta}</a>
            </article>
          ))}
        </div>

      </div>
    </MarketingShell>
  );
}
