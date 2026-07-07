import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { ChatBot } from "@/components/arthaflow/chat-bot";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://arthaflowglobal.com"),
  title: {
    default: "ArthaFlow Global — AI-Powered Export Infrastructure",
    template: "%s | ArthaFlow Global",
  },
  description:
    "Your AI-powered export department — without the overhead. We help Indian manufacturers export products to 50+ countries.",
  keywords: [
    "export",
    "MSME",
    "India",
    "AI export documents",
    "HS code",
    "export compliance",
    "buyer matching",
  ],
  openGraph: {
    title: "ArthaFlow Global — AI-Powered Export Infrastructure",
    description:
      "Your AI-powered export department — without the overhead. We help Indian manufacturers export products to 50+ countries.",
    url: "https://arthaflowglobal.com",
    siteName: "ArthaFlow Global",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArthaFlow Global — AI-Powered Export Infrastructure",
    description:
      "Your AI-powered export department — without the overhead. We help Indian manufacturers export products to 50+ countries.",
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
        {children}
        <ChatBot />
        <Analytics />
      </body>
    </html>
  );
}