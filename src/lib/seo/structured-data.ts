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
      name: "Free",
      price: "0",
      priceCurrency: "INR",
      description: "See if your product has a market.",
    },
    {
      "@type": "Offer",
      name: "Starter",
      price: "1500",
      priceCurrency: "INR",
      description: "For manufacturers taking the first step.",
    },
    {
      "@type": "Offer",
      name: "Growth",
      price: "3500",
      priceCurrency: "INR",
      description: "For manufacturers actively exporting.",
    },
    {
      "@type": "Offer",
      name: "Enterprise",
      price: "8000",
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
      a: "Yes. The Free plan stays free and includes 3 AI document generations a month, HS code classification, your export readiness score, and 10 Export Saathi questions. No credit card required.",
    },
    {
      q: "Why are you more expensive than a lookup tool?",
      a: "Because we do a different job. Tools that cost a few hundred rupees a month answer a question — a code, a duty rate. We produce the output: the classified product, every compliance document, and the market analysis behind where to sell it, in your own language. Our subscription is also the entry point rather than the whole relationship — as you begin shipping, we handle freight, insurance and trade finance alongside you.",
    },
    {
      q: 'What counts as an "AI Document"?',
      a: "Product export sheets, HS code classification reports, and proforma invoices. Each generation counts as one document on the Free and Starter plans; Growth and Enterprise are unlimited.",
    },
    {
      q: "How does Export Saathi find markets for my product?",
      a: "Saathi classifies your product against the real customs nomenclature, then queries official UN Comtrade and World Bank trade data to show which countries import it, at what value, and whether that demand is growing. Every figure is traceable to its source. It works in Hindi and regional languages.",
    },
    {
      q: "Do you offer one-time help instead of a subscription?",
      a: "Yes. A one-time self-export consultation is ₹15,000 — classification, documentation and your first shipment, without an ongoing plan.",
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
