import type { Metadata } from "next";

/** page.tsx is a client component (search filter), so metadata lives here. */
export const metadata: Metadata = {
  title: "Export Knowledge Hub — Guides for Indian Exporters",
  description:
    "Practical export guides for Indian manufacturers: IEC registration, HS code classification, Incoterms explained, export finance and a first-shipment checklist.",
  alternates: { canonical: "/blog" },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
