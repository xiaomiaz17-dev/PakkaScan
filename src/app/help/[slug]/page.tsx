import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/SiteChrome";
import { getHelpArticle, HELP_ARTICLES } from "@/content/help";

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  return { title: article?.title ?? "Help", description: article?.summary };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
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