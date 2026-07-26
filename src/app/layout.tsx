import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ChatBot } from "@/components/arthaflow/chat-bot";
import { JsonLdScript } from "@/components/arthaflow/json-ld";
import { organizationSchema, websiteSchema } from "@/lib/seo/structured-data";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const SITE_DESCRIPTION =
  "Tech-enabled export infrastructure for India's MSME manufacturers. Classify HS codes, generate export documents, and find the markets that want your product.";

export const metadata: Metadata = {
  metadataBase: new URL("https://arthaflowglobal.com"),
  title: {
    default: "ArthaFlow Global — Export Infrastructure for Indian Manufacturers",
    template: "%s | ArthaFlow Global",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "export",
    "MSME",
    "India",
    "AI export documents",
    "HS code",
    "export compliance",
    "buyer matching",
  ],
  // Every page resolves its own canonical against metadataBase. Without this
  // the apex and www forms of a URL can both be indexed as separate pages.
  alternates: { canonical: "/" },
  openGraph: {
    title: "ArthaFlow Global — Export Infrastructure for Indian Manufacturers",
    description: SITE_DESCRIPTION,
    url: "https://arthaflowglobal.com",
    siteName: "ArthaFlow Global",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArthaFlow Global — Export Infrastructure for Indian Manufacturers",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-text-body">
        <JsonLdScript data={[organizationSchema, websiteSchema]} />
        {children}
        <ChatBot />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}