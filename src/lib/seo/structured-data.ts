/**
 * JSON-LD structured data.
 *
 * Search engines read the rendered page for content but rely on schema.org
 * markup to understand what an entity IS. Without it we are a page about
 * exports; with it we are a named company with a product, a price and answers
 * to specific questions — which is what earns a knowledge panel and expanded
 * results rather than a plain blue link.
 *
 * Everything here must stay true to what the site actually claims. A price or
 * a feature that drifts from the pricing page is worse than no markup: Google
 * treats contradicted structured data as a quality signal against the site.
 */

export const SITE_URL = "https://arthaflowglobal.com";

/** Rendered into a <script type="application/ld+json"> tag. */
export type JsonLd = Record<string, unknown>;

export const organizationSchema: JsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "ArthaFlow Global",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Tech-enabled export infrastructure for India's MSME manufacturers — HS classification, export documentation and market discovery in one platform.",
  foundingDate: "2026",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Pune",
    addressRegion: "Maharashtra",
    addressCountry: "IN",
  },
  areaServed: {
    "@type": "Country",
    name: "India",
  },
  knowsAbout: [
    "Export documentation",
    "HS code classification",
    "International trade compliance",
    "MSME exports",
    "Incoterms",
  ],
};

export const websiteSchema: JsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "ArthaFlow Global",
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "en-IN",
};

/**
 * Offers mirror the pricing page exactly. If a tier changes there, change it
 * here in the same commit — see the note at the top of this file.
 */
export const softwareSchema: JsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ArthaFlow Global",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  publisher: { "@id": `${SITE_URL}/#organization` },
  description:
    "Export platform for Indian manufacturers: AI document generation, HS code classification, export readiness scoring and buyer discovery.",
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      price: "0",
      priceCurrency: "INR",
      description: "For manufacturers exploring exports.",
    },
    {
      "@type": "Offer",
      name: "Growth",
      price: "9999",
      priceCurrency: "INR",
      description: "For active exporters.",
    },
    {
      "@type": "Offer",
      name: "Managed",
      price: "29999",
      priceCurrency: "INR",
      description: "Full-service export partner.",
    },
  ],
};

/** Mirrors the FAQ rendered on /pricing. Keep the two in step. */
export const pricingFaqSchema: JsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      q: "Is there really a free plan?",
      a: "Yes. The Starter plan is free forever and includes 3 AI document generations per month, HS code classification, and your export readiness score. No credit card required.",
    },
    {
      q: 'What counts as an "AI Document"?',
      a: "Product export sheets, HS code classification reports, and proforma invoices. Each generation counts as one document on the Starter plan; Growth and Managed are unlimited.",
    },
    {
      q: "How does buyer matching work?",
      a: "We match your verified product catalogue against international buyer demand sourced from trade channels. Available on Growth and Managed plans.",
    },
    {
      q: "Can I change plans later?",
      a: "Absolutely. Upgrade, downgrade, or cancel anytime. Changes take effect at the start of your next billing cycle.",
    },
  ].map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};
