import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/SiteChrome";
import { getHelpArticle, HELP_ARTICLES } from "@/content/help";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getHelpArticle(params.slug);
  return { title: article?.title ?? "Help", description: article?.summary };
}

export default function HelpArticlePage({ params }: { params: { slug: string } }) {
  const article = getHelpArticle(params.slug);
  if (!article) notFound();
  return (
    <MarketingShell>
      <div className="shell prose">
        <p>
          <Link href="/help">← Help centre</Link>
        </p>
        <h1>{article.title}</h1>
        <p className="muted">{article.summary}</p>
        <ol>
          {article.body.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </div>
    </MarketingShell>
  );
}
