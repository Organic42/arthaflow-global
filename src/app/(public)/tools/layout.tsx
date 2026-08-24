import type { Metadata } from "next";

/** page.tsx holds form state, so metadata lives here. */
export const metadata: Metadata = {
  title: "Free Export Toolkit — HS Code, Duty, GST, RoDTEP & Landed Cost",
  description:
    "One search gives an Indian manufacturer the tariff line, export policy, GST, RoDTEP and Duty Drawback, then import duty, VAT, FTA eligibility and landed cost in 44 markets. Real government data, no sign-up.",
  alternates: { canonical: "/tools" },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
