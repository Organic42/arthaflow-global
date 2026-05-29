"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "For manufacturers exploring exports",
    features: [
      "AI Document Generator (3/month)",
      "HS Code Classifier",
      "Document Vault (5 docs)",
      "Export Readiness Score",
    ],
    cta: "Get Started Free",
    variant: "outline" as const,
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹9,999",
    period: "/mo",
    desc: "For active exporters",
    features: [
      "Everything in Starter",
      "Unlimited AI Documents",
      "Buyer Inquiry Access",
      "WhatsApp Notifications",
      "Priority Support",
    ],
    cta: "Start Growth Plan",
    variant: "default" as const,
    highlight: true,
  },
  {
    name: "Managed",
    price: "₹29,999",
    period: "/mo",
    desc: "Full-service export partner",
    features: [
      "Everything in Growth",
      "Dedicated Export Manager",
      "Logistics Orchestration",
      "Compliance Handholding",
      "Quarterly Business Reviews",
    ],
    cta: "Contact Sales",
    variant: "default" as const,
    highlight: false,
  },
];

const faqs = [
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
        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <div
              key={i}
              className={`relative rounded-2xl border bg-card p-8 ${
                t.highlight
                  ? "scale-[1.03] border-2 border-action-blue border-t-4 border-t-artha-gold shadow-lg"
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
                  variant={t.variant}
                  className={`w-full ${
                    t.name === "Managed"
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
