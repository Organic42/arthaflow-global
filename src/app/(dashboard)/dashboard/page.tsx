"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/arthaflow/stat-card";
import { ProgressBar } from "@/components/arthaflow/progress-bar";
import { Zap } from "lucide-react";

const stats = [
  { label: "Export Readiness", value: "87", suffix: "/100", color: "text-action-blue" },
  { label: "Active Inquiries", value: "3", suffix: "new", color: "text-artha-gold" },
  { label: "Documents Ready", value: "12", suffix: "/15", color: "text-success" },
  { label: "Shipments", value: "2", suffix: "in transit", color: "text-purple" },
];

const activity = [
  { badge: "New", badgeClass: "bg-blue-bg text-action-blue", text: "Buyer inquiry received — Auto parts, Germany", time: "2 hours ago", href: "/inquiries" },
  { badge: "Done", badgeClass: "bg-green-bg text-success", text: "Product sheet generated — CNC Components", time: "Yesterday", href: "/documents" },
  { badge: "Verified", badgeClass: "bg-gold-bg text-[#92710A]", text: "IEC registration verified by ArthaFlow", time: "2 days ago", href: null },
  { badge: "Transit", badgeClass: "bg-purple-bg text-purple", text: "Shipment SH-2024-001 cleared customs — UAE", time: "3 days ago", href: "/shipments" },
];

const readiness = [
  { label: "IEC Registered", pct: 100 },
  { label: "AD Code Active", pct: 100 },
  { label: "Product Catalogue", pct: 75 },
  { label: "Certifications", pct: 50 },
  { label: "GST Active", pct: 100 },
  { label: "Bank Verified", pct: 100 },
];

const quickActions = [
  { label: "Upload Document", href: "/documents" },
  { label: "Add Product", href: "/products" },
  { label: "View HS Codes", href: "/documents/generate" },
  { label: "Contact ArthaFlow", href: null },
];

function ActivityRow({
  badge,
  badgeClass,
  text,
  time,
  href,
  isLast,
}: {
  badge: string;
  badgeClass: string;
  text: string;
  time: string;
  href: string | null;
  isLast: boolean;
}) {
  const inner = (
    <div
      className={`flex items-center gap-3.5 px-6 py-4 transition-colors ${
        !isLast ? "border-b border-subtle" : ""
      } ${href ? "cursor-pointer hover:bg-background" : ""}`}
    >
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
        {badge}
      </span>
      <span className="flex-1 text-sm text-text-body">{text}</span>
      <span className="shrink-0 text-[13px] whitespace-nowrap text-text-muted">
        {time}
      </span>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickActionRow({ label, href }: { label: string; href: string | null }) {
  const [hov, setHov] = useState(false);
  const inner = (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[13px] font-medium text-text-body transition-colors ${
        hov ? "bg-hover-blue" : "bg-background"
      }`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-action-blue" />
      {label}
    </button>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1280px] p-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* MAIN */}
        <div>
          {/* Welcome */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">
                Good morning, Rajesh
              </h1>
              <p className="mt-0.5 text-sm text-text-secondary">
                Here&apos;s your export readiness overview
              </p>
            </div>
            <Link href="/documents/generate">
              <Button>
                <Zap size={16} />
                Generate Export Docs
              </Button>
            </Link>
          </div>

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s, i) => (
              <StatCard key={i} {...s} />
            ))}
          </div>

          {/* Activity */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-subtle px-6 py-5">
              <h2 className="text-base font-bold text-text-heading">
                Recent Activity
              </h2>
              <a className="cursor-pointer text-[13px] font-medium text-action-blue hover:underline">
                View all
              </a>
            </div>
            {activity.map((a, i) => (
              <ActivityRow
                key={i}
                {...a}
                isLast={i === activity.length - 1}
              />
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="flex flex-col gap-5">
          {/* Export Readiness */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4.5 text-sm font-bold text-text-heading">
              Export Readiness
            </h3>
            <div className="flex flex-col gap-3.5">
              {readiness.map((r, i) => (
                <div key={i}>
                  <div className="mb-1.5 flex justify-between">
                    <span className="text-xs font-medium text-text-body">
                      {r.label}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        r.pct === 100 ? "text-success" : "text-artha-gold"
                      }`}
                    >
                      {r.pct}%
                    </span>
                  </div>
                  <ProgressBar
                    value={r.pct}
                    color={r.pct === 100 ? "bg-success" : "bg-artha-gold"}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-3.5 text-sm font-bold text-text-heading">
              Quick Actions
            </h3>
            <div className="flex flex-col gap-2">
              {quickActions.map((q, i) => (
                <QuickActionRow key={i} {...q} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
