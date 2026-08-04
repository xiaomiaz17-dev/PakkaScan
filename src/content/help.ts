export type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  body: string[];
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "Create an account, complete onboarding, and run your first analysis.",
    body: [
      "Register with a valid email and password (minimum 10 characters).",
      "Follow onboarding or open Dashboard → Create property.",
      "Upload a Fard or supporting document, then run analysis from the property workspace.",
      "Sample properties are clearly labelled demo text and are not real titles.",
    ],
  },
  {
    slug: "reading-reports",
    title: "Reading reports and Property Passport",
    summary: "How to interpret PakkaScore, findings and verification IDs.",
    body: [
      "PakkaScore and findings are decision-support, not legal advice.",
      "Each material finding should remain linkable to evidence references.",
      "The Property Passport is a permanent summary of the latest verified analysis for that property.",
      "Low-confidence fields are never silently accepted.",
    ],
  },
  {
    slug: "plans-billing",
    title: "Plans and billing",
    summary: "Explore, Professional and Team entitlements.",
    body: [
      "Explore supports sample journeys.",
      "Professional unlocks full reports subject to quota.",
      "Team adds seats and review workflows.",
      "Stripe checkout is prepared as an integration boundary and requires founder credentials before live charges.",
    ],
  },
  {
    slug: "privacy-security",
    title: "Privacy and security",
    summary: "Isolation, encryption boundaries and support contacts.",
    body: [
      "Customer data is isolated by account at the application layer.",
      "Document bytes are stored encrypted at rest in the application object path.",
      "Contact support@pakkascan.com for security reports.",
    ],
  },
];

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}
