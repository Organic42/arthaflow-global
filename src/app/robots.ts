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
    sitemap: "https://arthaflowglobal.com/sitemap.xml",
  };
}
