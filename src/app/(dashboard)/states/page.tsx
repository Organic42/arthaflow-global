"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Zap, Inbox, Folder } from "lucide-react";

const empties = [
  {
    key: "welcome",
    icon: <Zap size={36} />,
    title: "Welcome to ArthaFlow!",
    desc: "Complete your onboarding to unlock AI documents, buyer matching, and logistics.",
    action: "Start Onboarding",
    href: "/onboarding",
    color: "text-action-blue",
    bg: "bg-blue-bg",
  },
  {
    key: "inquiries",
    icon: <Inbox size={36} />,
    title: "No buyer inquiries yet",
    desc: "Inquiries appear here when ArthaFlow matches your products with international buyers. Make sure your product catalogue is complete.",
    action: "Complete Catalogue",
    href: "/products",
    color: "text-artha-gold",
    bg: "bg-gold-bg",
  },
  {
    key: "documents",
    icon: <Folder size={36} />,
    title: "No documents yet",
    desc: "Generate your first export document with AI in just 30 seconds.",
    action: "Generate Documents",
    href: "/documents/generate",
    color: "text-success",
    bg: "bg-green-bg",
  },
];

export default function StatesPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <h1 className="mb-1.5 text-2xl font-extrabold tracking-tight text-text-heading">
        Empty & Error States
      </h1>
      <p className="mb-7 text-sm text-text-secondary">
        A gallery of the empty, welcome, and error states used across the platform.
      </p>

      {/* 404 */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-subtle px-5 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
          404 — Page Not Found
        </div>
        <div className="flex flex-col items-center justify-center px-8 py-14 text-center">
          <div className="text-[96px] font-extrabold leading-none tracking-[-4px] text-border">
            404
          </div>
          <h2 className="mt-3 mb-2 text-[22px] font-bold text-text-heading">
            Page not found
          </h2>
          <p className="mb-6 max-w-[360px] text-sm text-text-secondary">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link href="/dashboard">
            <Button>
              <Home size={16} /> Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Empty state cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {empties.map((e) => (
          <div key={e.key} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-subtle px-5 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary">
              {e.key} state
            </div>
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full ${e.bg} ${e.color}`}>
                {e.icon}
              </div>
              <h3 className="mb-2 text-[17px] font-bold text-text-heading">{e.title}</h3>
              <p className="mb-5 text-[13px] leading-snug text-text-secondary">{e.desc}</p>
              <Link href={e.href}>
                <Button>{e.action}</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
