import type { MetadataRoute } from "next";
import { SITE } from "@/content/site";

/**
 * Next.js dynamic robots.txt generator.
 *
 * Security posture:
 * - Allow indexing of public marketing + product pages
 * - Disallow API endpoints, payment pages, auth flows, and admin routes
 * - Block aggressive commercial SEO crawlers that waste bandwidth
 *
 * Note: robots.txt is a POLITE request. Malicious bots ignore it.
 * For real protection against attackers, use Vercel Firewall + rate limiting.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/scan",
          "/sample-report",
          "/product",
          "/about",
          "/contact",
          "/terms",
          "/privacy",
          "/features",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/payment/",
          "/verify",
          "/login",
          "/wp-admin/",
          "/wp-login.php",
        ],
      },
      // Block aggressive commercial SEO crawlers (waste bandwidth, no SEO benefit)
      {
        userAgent: ["SemrushBot", "AhrefsBot", "MJ12bot", "DotBot", "PetalBot", "BLEXBot"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}