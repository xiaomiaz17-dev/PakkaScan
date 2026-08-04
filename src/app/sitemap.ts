import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

const paths = [
  "/",
  "/sample-report",
  "/product",
  "/how-it-works",
  "/features",
  "/property-passport",
  "/pricing",
  "/faq",
  "/about",
  "/contact",
  "/security",
  "/why-pakkascan",
  "/compare",
  "/beta",
  "/blog",
  "/docs",
  "/roadmap",
  "/privacy",
  "/terms",
  "/cookies",
  "/support",
  "/help",
  "/account",
  "/status",
  "/login",
  "/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return paths.map((path) => ({
    url: `${SITE.url}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
