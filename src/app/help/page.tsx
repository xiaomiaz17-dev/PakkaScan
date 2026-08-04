import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/SiteChrome";
import { HELP_ARTICLES } from "@/content/help";

export const metadata: Metadata = {
  title: "Help centre",
  description: "Guides for getting started, reports, billing and security.",
};

export default function HelpIndexPage() {
  return (
    <MarketingShell>
      <div className="shell prose">
        <h1>Help centre</h1>
        <p className="muted">Practical guides for PakkaScan customers and beta participants.</p>
        <div className="stack">
          {HELP_ARTICLES.map((article) => (
            <article key={article.slug} className="card">
              <h2>
                <Link href={`/help/${article.slug}`}>{article.title}</Link>
              </h2>
              <p className="muted">{article.summary}</p>
            </article>
          ))}
        </div>
        <p className="muted">
          Still stuck? <Link href="/support">Contact support</Link> or <Link href="/faq">read the FAQ</Link>.
        </p>
      </div>
    </MarketingShell>
  );
}
