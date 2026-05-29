"use client";

import { HoverCard } from "@/components/arthaflow/hover-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Clock, Search } from "lucide-react";

const featured = {
  cat: "Getting Started",
  title: "How to Get Your IEC in 2026: Complete Step-by-Step Guide",
  excerpt:
    "The Import Export Code is your gateway to international trade. We walk through every form, fee, and follow-up.",
  read: "8 min read",
  date: "May 22, 2026",
};

const articles = [
  {
    cat: "Compliance",
    catColor: "gold" as const,
    title: "HS Code Classification: Why It Matters",
    excerpt:
      "A wrong HS code can mean delayed shipments and unexpected duties.",
    read: "6 min",
    date: "May 18, 2026",
    bg: "bg-gold-bg",
    color: "text-[#92710A]",
  },
  {
    cat: "Market Insights",
    catColor: "purple" as const,
    title: "Top 5 Export Markets for Indian Engineering Goods",
    excerpt:
      "Where the demand is, what they pay, and how to position your products.",
    read: "7 min",
    date: "May 14, 2026",
    bg: "bg-purple-bg",
    color: "text-purple",
  },
  {
    cat: "Logistics",
    catColor: "green" as const,
    title: "Understanding Incoterms: FOB vs CIF vs DDP",
    excerpt:
      "The three letters that decide who pays for what. A plain-English breakdown.",
    read: "5 min",
    date: "May 10, 2026",
    bg: "bg-green-bg",
    color: "text-success",
  },
  {
    cat: "Compliance",
    catColor: "gold" as const,
    title: "Working Capital for Exports: Financing Options for MSMEs",
    excerpt: "Pre-shipment credit, factoring, and export finance schemes.",
    read: "9 min",
    date: "May 6, 2026",
    bg: "bg-gold-bg",
    color: "text-[#92710A]",
  },
  {
    cat: "Getting Started",
    catColor: "blue" as const,
    title: "Your First Export Checklist: 15 Things You Need",
    excerpt:
      "From IEC to insurance — the complete pre-flight checklist.",
    read: "6 min",
    date: "May 2, 2026",
    bg: "bg-blue-bg",
    color: "text-action-blue",
  },
];

function BadgeColor({ cat }: { cat: string }) {
  const colorMap: Record<string, "gold" | "purple" | "green" | "blue"> = {
    Compliance: "gold",
    "Market Insights": "purple",
    Logistics: "green",
    "Getting Started": "blue",
  };
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
        colorMap[cat] === "gold"
          ? "bg-gold-bg text-[#92710A]"
          : colorMap[cat] === "purple"
            ? "bg-purple-bg text-purple"
            : colorMap[cat] === "green"
              ? "bg-green-bg text-success"
              : "bg-blue-bg text-action-blue"
      }`}
    >
      {cat}
    </span>
  );
}

export default function BlogPage() {
  return (
    <section className="min-h-[70vh] bg-background px-8 pb-24 pt-14">
      <div className="mx-auto max-w-[1100px]">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-text-heading">
              Export Knowledge Hub
            </h1>
            <p className="text-base text-text-secondary">
              Guides, compliance walkthroughs, and market insights.
            </p>
          </div>
          <div className="relative w-[280px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <Input placeholder="Search articles..." className="pl-9" />
          </div>
        </div>

        {/* Featured */}
        <HoverCard className="mb-8 overflow-hidden !p-0" onClick={() => {}}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative flex min-h-[280px] items-center justify-center bg-gradient-to-br from-action-blue to-navy">
              <FileText size={64} className="text-white/90" />
              <span className="absolute left-5 top-5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                FEATURED
              </span>
            </div>
            <div className="flex flex-col justify-center p-9">
              <BadgeColor cat={featured.cat} />
              <h2 className="mt-3.5 mb-3 text-2xl font-extrabold leading-tight tracking-tight text-text-heading">
                {featured.title}
              </h2>
              <p className="mb-5 text-[15px] leading-relaxed text-text-secondary">
                {featured.excerpt}
              </p>
              <div className="flex items-center gap-3 text-[13px] text-text-muted">
                <span>{featured.date}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={14} />
                  {featured.read}
                </span>
              </div>
            </div>
          </div>
        </HoverCard>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => (
            <HoverCard
              key={i}
              className="overflow-hidden !p-0"
              onClick={() => {}}
            >
              <div
                className={`flex h-[140px] items-center justify-center ${a.bg} ${a.color}`}
              >
                <FileText size={40} />
              </div>
              <div className="p-5">
                <div className="mb-3">
                  <BadgeColor cat={a.cat} />
                </div>
                <h3 className="mb-2 text-base font-bold leading-snug text-text-heading">
                  {a.title}
                </h3>
                <p className="mb-3.5 text-[13px] leading-snug text-text-secondary">
                  {a.excerpt}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span>{a.date}</span>
                  <span>·</span>
                  <span>{a.read}</span>
                </div>
              </div>
            </HoverCard>
          ))}
        </div>
      </div>
    </section>
  );
}
