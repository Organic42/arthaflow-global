import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
  title: "ArthaFlow Global — AI-Powered Export Infrastructure",
  description:
    "Your AI-powered export department — without the overhead. We help Indian manufacturers export products to 50+ countries.",
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
      </body>
    </html>
  );
}