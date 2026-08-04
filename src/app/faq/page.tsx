import type { Metadata } from "next";
import { MarketingShell } from "@/components/SiteChrome";
import { FAQ_ITEMS } from "@/content/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about legal scope, jurisdictions, evidence, and privacy.",
};

export default function Page() {
  return (
    <MarketingShell>
      <div className="stack prose" style={{ margin: "0 auto", padding: "32px 16px 64px" }}>
        <h1>FAQ</h1>
        <p className="muted">Common questions about legal scope, jurisdictions, evidence, and privacy.</p>
        
        <div className="faq">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p className="muted">{item.a}</p>
            </details>
          ))}
        </div>

      </div>
    </MarketingShell>
  );
}
