import type { Metadata } from "next";
import { JsonLdScript } from "@/components/arthaflow/json-ld";
import { pricingFaqSchema } from "@/lib/seo/structured-data";

/**
 * page.tsx is a client component (the tier toggle and FAQ accordion hold
 * state), and a client component cannot export metadata. This layout carries
 * it — and the FAQ markup, which has to render server-side to be crawlable.
 */
export const metadata: Metadata = {
  title: "Pricing — Free to Start, ₹1,500/mo to Export",
  description:
    "ArthaFlow pricing for Indian exporters. Start free with 3 AI documents a month, HS code classification and an export readiness score. Paid plans from ₹1,500/month. No credit card required.",
  alternates: { canonical: "/pricing" },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLdScript data={pricingFaqSchema} />
      {children}
    </>
  );
}
