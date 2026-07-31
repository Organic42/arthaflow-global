import type { Metadata } from "next";

/** page.tsx holds form state, so metadata lives here. */
export const metadata: Metadata = {
  title: "Export Landed Cost Calculator — Free, No Sign-Up",
  description:
    "Work out what your buyer pays to land your goods abroad, and what you net after RoDTEP and Duty Drawback. Real duty rates for 44 countries, official Indian tariff lines and export policy. Free.",
  alternates: { canonical: "/calculator" },
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
