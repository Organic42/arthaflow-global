import type { Metadata } from "next";

/** page.tsx holds form state, so metadata lives here. */
export const metadata: Metadata = {
  title: "HSN Code Search — GST Rate, Export Policy & Incentives, Free",
  description:
    "Search any product or HSN code for its Indian tariff line, GST rate, export policy, RoDTEP rebate and Duty Drawback rate. Real government data, no sign-up, no live API calls.",
  alternates: { canonical: "/hsn-search" },
};

export default function HsnSearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
