"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown } from "lucide-react";

// Prices here are the source of truth for the site and MUST match the
// Assumptions sheet of the financial model (Starter 1500 / Growth 3500 /
// Enterprise 8000) and src/lib/seo/structured-data.ts. Investors hold the
// model; a site that quotes different numbers is the kind of discrepancy
// diligence finds immediately. Change all three together or none.
const tiers = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    desc: "See if your product has a market",
    features: [
      "3 AI documents / month",
      "HS Code Classifier",
      "Export Readiness Score",
      "Export Saathi — 10 questions / month",
    ],
    cta: "Get Started Free",
    variant: "outline" as const,
    highlight: false,
  },
  {
    name: "Starter",
    price: "₹1,500",
    period: "/mo",
    desc: "For manufacturers taking the first step",
    features: [
      "Limited AI documents",
      "Single product listing",
      "HS Code Classifier",
      "Export Readiness Score",
      "Email support",
    ],
    cta: "Start with Starter",
    variant: "outline" as const,
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹3,500",
    period: "/mo",
    desc: "For manufacturers actively exporting",
    features: [
      "Everything in Starter",
      "Unlimited AI documents",
      "Full product catalogue",
      "Export Saathi — unlimited market intelligence",
      "WhatsApp notifications",
      "Priority support",
    ],
    cta: "Start Growth Plan",
    variant: "default" as const,
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "₹8,000",
    period: "/mo",
    desc: "Full-service export partner",
    features: [
      "Everything in Growth",
      "Dedicated export manager",
      "API access",
      "White-label export",
      "Compliance handholding",
      "Quarterly business reviews",
    ],
    cta: "Contact Sales",
    variant: "default" as const,
    highlight: false,
  },
];

const faqs = [
  {
    q: "Is there really a free plan?",
    a: "Yes. The Free plan stays free and includes 3 AI document generations a month, HS code classification, your export readiness score, and 10 Export Saathi questions. No credit card required. It exists so you can find out whether your product has a market before paying us anything.",
  },
  {
    q: "Why are you more expensive than a lookup tool?",
    a: "Because we do a different job. Tools that cost a few hundred rupees a month answer a question — a code, a duty rate. We produce the output: the classified product, every compliance document, and the market analysis behind where to sell it, in your own language. And our subscription is the entry point, not the whole relationship — as you begin shipping, we handle freight, insurance and trade finance alongside you. We are priced to be worth keeping, not to be the cheapest tab open.",
  },
  {
    q: 'What counts as an "AI Document"?',
    a: "Product export sheets, HS code classification reports, and proforma invoices. Each generation counts as one document on the Free and Starter plans; Growth and Enterprise are unlimited.",
  },
  {
    q: "How does Export Saathi find markets for my product?",
    a: "Saathi classifies your product against the real customs nomenclature, then queries official UN Comtrade and World Bank trade data to show which countries import it, at what value, and whether that demand is growing. Every figure is traceable to its source, and it will tell you when data is unavailable rather than guess. It works in Hindi and regional languages.",
  },
  {
    q: "Do you offer one-time help instead of a subscription?",
    a: "Yes. A one-time self-export consultation is ₹15,000 — we take you through classification, documentation and your first shipment without an ongoing plan. Most manufacturers who start there move onto a subscription once they are shipping regularly.",
  },
  {
    q: "Can I change plans later?",
    a: "Absolutely. Upgrade, downgrade, or cancel anytime. Changes take effect at the start of your next billing cycle.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <section className="min-h-[70vh] bg-background px-8 pb-24 pt-18">
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}
        <div className="mb-14 text-center">
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-text-heading sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-text-secondary">
            Start free. Scale as you grow.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t, i) => (
            <div
              key={i}
              className={`relative rounded-2xl border bg-card p-8 ${
                t.highlight
                  ? "scale-[1.03] border-2 border-artha-gold shadow-lg"
                  : "border-border shadow-sm"
              }`}
            >
              {t.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-artha-gold px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-navy">
                  Most Popular
                </div>
              )}
              <h3 className="mb-1.5 text-lg font-bold text-text-heading">
                {t.name}
              </h3>
              <p className="mb-5 min-h-[34px] text-[13px] text-text-secondary">
                {t.desc}
              </p>
              <div className="mb-6 flex items-baseline gap-0.5">
                <span className="text-4xl font-extrabold tracking-tight text-text-heading">
                  {t.price}
                </span>
                <span className="text-[15px] text-text-secondary">
                  {t.period}
                </span>
              </div>
              <div className="mb-7 flex flex-col gap-3">
                {t.features.map((f, j) => (
                  <div
                    key={j}
                    className="flex items-start gap-2.5 text-sm text-text-body"
                  >
                    <span className="mt-0.5 shrink-0 text-success">
                      <Check size={16} />
                    </span>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/login">
                <Button
                  variant={t.highlight ? "default" : "outline"}
                  className={`w-full ${
                    t.highlight
                      ? "bg-artha-gold text-navy hover:bg-artha-gold/90"
                      : ""
                  }`}
                >
                  {t.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-18 max-w-[720px]">
          <h2 className="mb-8 text-center text-2xl font-extrabold tracking-tight text-text-heading">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-3">
            {faqs.map((f, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="flex w-full items-center justify-between px-5 py-4.5 text-left text-[15px] font-semibold text-text-heading"
                >
                  {f.q}
                  <span
                    className={`text-text-muted transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown size={16} />
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: openFaq === i ? 200 : 0 }}
                >
                  <p className="px-5 pb-4.5 text-sm leading-relaxed text-text-secondary">
                    {f.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
