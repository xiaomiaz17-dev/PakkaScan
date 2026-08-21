/**
 * Commercial site copy — PakkaScan brand (rebrand from PakkaDeed).
 * Internal engines (Property Passport, Evidence, Verification) keep stable names.
 */

export const SITE = {
  name: "PakkaScan",
  formerName: "PakkaDeed",
  tagline: "AI-powered legal due diligence for Pakistani property.",
  description:
    "Upload Pakistani property documents and receive an explainable PakkaScore, evidence-backed findings and a permanent Property Passport.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://pakkascan.com",
  supportEmail: "support@pakkascan.com",
} as const;

export const NAV = [
  { href: "/product", label: "Product" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/docs", label: "Docs" },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/product", label: "Product" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/features", label: "Features" },
      { href: "/property-passport", label: "Property Passport" },
      { href: "/pricing", label: "Pricing" },
      { href: "/sample-report", label: "Sample report" },
      { href: "/verify", label: "Verify hash" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/security", label: "Security" },
      { href: "/faq", label: "FAQ" },
      { href: "/why-pakkascan", label: "Why PakkaScan" },
      { href: "/status", label: "Status" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/help", label: "Help centre" },
      { href: "/support", label: "Support" },
      { href: "/beta", label: "Beta programme" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/limitations", label: "Limitations" },
      { href: "/cookies", label: "Cookies" },
      { href: "/about", label: "About" },
    ],
  },
] as const;

/** Pages kept live but intentionally unlinked in Phase 1 nav/footer (closed beta). */
export const PHASE1_UNLINKED = [
  "/investors",
  "/careers",
  "/press-kit",
  "/media-kit",
  "/developers",
  "/compare",
  "/blog",
  "/roadmap",
  "/testimonials",
] as const;

export const PRICING_PLANS = [
  {
    id: "free",
    name: "Explore",
    price: "Rs 0",
    period: "forever",
    blurb: "See how PakkaScan works with sample evidence.",
    features: ["1 sample property", "Read-only Passport demo", "Community support"],
    cta: "View sample report",
    href: "/sample-report",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Professional",
    price: "Rs 4,900",
    period: "per report",
    blurb: "Full analysis for buyers, agents and conveyancers.",
    features: [
      "Full PakkaScore report",
      "Evidence-linked findings",
      "Property Passport",
      "Email delivery",
      "Priority support",
    ],
    cta: "Buy a report",
    href: "/register?plan=pro",
    highlighted: true,
  },
  {
    id: "team",
    name: "Team",
    price: "Custom",
    period: "monthly",
    blurb: "Shared workspaces for agencies and law firms.",
    features: ["Seats & roles", "Review queue", "Usage tracking", "Invoice history", "SLA options"],
    cta: "Talk to us",
    href: "/contact?intent=team",
    highlighted: false,
  },
] as const;

export const FAQ_ITEMS = [
  {
    q: "Does PakkaScan replace a lawyer?",
    a: "No. PakkaScan is decision-support: it scores and explains document evidence. Legal advice remains with qualified professionals.",
  },
  {
    q: "What jurisdictions are supported?",
    a: "Phase 1 focuses on Pakistani property documents across major jurisdictions, with province-aware rules and continuous expansion.",
  },
  {
    q: "How is evidence handled?",
    a: "Documents are hashed, findings link to immutable evidence references, and low-confidence fields are never silently accepted.",
  },
  {
    q: "Was this product formerly called PakkaDeed?",
    a: "Yes. PakkaScan is the commercial brand. Property Passport, evidence, and the verification engine are unchanged.",
  },
  {
    q: "Is my data shared?",
    a: "Customer data is isolated by account. We do not sell property data. See the Privacy Policy for retention and subprocessors.",
  },
] as const;
