import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/products",
        "/documents",
        "/inquiries",
        "/shipments",
        "/settings",
        "/mobile",
        "/states",
        "/help",
        "/admin",
        "/onboarding",
        "/api/",
      ],
    },
    // Two sitemaps: the hand-maintained marketing pages, and the generated
    // per-tariff-line pages under /export. A crawler that only reads the
    // first would never discover the ten thousand pages that carry the data.
    sitemap: [
      "https://arthaflowglobal.com/sitemap.xml",
      "https://arthaflowglobal.com/export/sitemap.xml",
    ],
  };
}
