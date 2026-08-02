"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/arthaflow/stat-card";
import { ProgressBar } from "@/components/arthaflow/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
      <span className="shrink-0 whitespace-nowrap text-[13px] text-text-muted">{time}</span>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickActionRow({ label, href }: { label: string; href: string | null }) {
  const inner = (
    <div className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[13px] font-medium text-text-body transition-colors hover:bg-hover-blue bg-background">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-action-blue" />
      {label}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <button className="w-full">{inner}</button>;
}

const badgeColors: Record<string, string> = {
  blue: "bg-blue-bg text-action-blue",
  green: "bg-green-bg text-success",
  gold: "bg-gold-bg text-[#92710A]",
  purple: "bg-purple-bg text-purple",
  red: "bg-red-bg text-error",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/** Only the fields this page reads — not the full profiles row. */
interface DashboardProfile {
  full_name?: string | null;
}

/** An activity-feed row as rendered below. */
interface ActivityRow {
  id: string;
  badge: string;
  badge_color: string;
  text: string;
  created_at: string;
  // Present on every row, nullable rather than optional — that is what the
  // column is, and the card below expects `string | null`.
  link_to: string | null;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [stats, setStats] = useState({ products: 0, documents: 0, inquiries: 0, shipments: 0 });
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [readiness, setReadiness] = useState<{ label: string; pct: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Six queries feed this page; a single one failing (say, the activity
    // feed) must not stop the stats and readiness score the rest of the
    // page depends on from rendering. Every error is collected instead —
    // one banner with retry if anything failed, but whatever DID come back
    // still renders.
    const failures: string[] = [];

    // Load profile
    const { data: p, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (profileErr) failures.push(profileErr.message);
    setProfile(p);

    // Count stats — fetch id arrays (reliable; HEAD count requests get
    // aborted by React StrictMode's double-mount in dev and return null).
    // Products also carries `certifications` now — the readiness score
    // below used to hardcode this at 50% for every user regardless of
    // their real data; it's computed from the same field mobile/page.tsx
    // already reads, so the two dashboards can't disagree on it again.
    const [prodRes, docRes, inqRes, shipRes] = await Promise.all([
      supabase.from("products").select("id, certifications").eq("user_id", user.id),
      supabase.from("documents").select("id").eq("user_id", user.id),
      supabase.from("inquiries").select("id").eq("user_id", user.id).eq("status", "new"),
      supabase.from("shipments").select("id").eq("user_id", user.id),
    ]);
    for (const r of [prodRes, docRes, inqRes, shipRes]) {
      if (r.error) failures.push(r.error.message);
    }
    const productCount = prodRes.data?.length || 0;
    const hasCertifications = (prodRes.data ?? []).some(
      (p) => Array.isArray(p.certifications) && p.certifications.length > 0
    );
    setStats({
      products: productCount,
      documents: docRes.data?.length || 0,
      inquiries: inqRes.data?.length || 0,
      shipments: shipRes.data?.length || 0,
    });

    // Calculate readiness
    if (p) {
      setReadiness([
        { label: "IEC Registered", pct: p.has_iec ? 100 : 0 },
        { label: "AD Code Active", pct: p.ad_code_registered === "yes" ? 100 : 0 },
        { label: "Product Catalogue", pct: productCount > 0 ? 75 : 0 },
        { label: "Certifications", pct: hasCertifications ? 100 : 0 },
        { label: "GST Active", pct: p.gst_number ? 100 : 0 },
        { label: "Bank Verified", pct: 0 },
      ]);
    }

    // Load activity
    const { data: acts, error: actErr } = await supabase
      .from("activity_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (actErr) failures.push(actErr.message);
    setActivity(acts || []);

    if (failures.length > 0) {
      console.error("Dashboard load errors:", failures);
      setError("Some of your dashboard data couldn't load.");
    }

    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  const readinessScore = readiness.length
    ? Math.round(readiness.reduce((sum, r) => sum + r.pct, 0) / readiness.length)
    : 0;

  const quickActions = [
    { label: "Upload Document", href: "/documents" },
    { label: "Add Product", href: "/products" },
    { label: "View HS Codes", href: "/hsn-search" },
    { label: "Contact ArthaFlow", href: "mailto:info@arthaflowglobal.com" },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] p-8">
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="mt-6 h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] p-8">
      {error && (
        <div className="mb-4 rounded-lg bg-red-bg px-4 py-3 text-sm text-error">
          {error}{" "}
          <button onClick={load} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* MAIN */}
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[240px] flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">
                Good morning, {profile?.full_name?.split(" ")[0] || "there"}
              </h1>
              <p className="mt-0.5 text-sm text-text-secondary">
                Here&apos;s your export readiness overview
              </p>
            </div>
            <Link href="/documents/generate">
              <Button><Zap size={16} /> Generate Export Docs</Button>
            </Link>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Export Readiness" value={String(readinessScore)} suffix="/100" color="text-action-blue" />
            <StatCard label="Active Inquiries" value={String(stats.inquiries)} suffix="new" color="text-artha-gold" />
            <StatCard label="Documents" value={String(stats.documents)} suffix="total" color="text-success" />
            <StatCard label="Products" value={String(stats.products)} suffix="listed" color="text-purple" />
          </div>

          {/* Activity */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-subtle px-6 py-5">
              <h2 className="text-base font-bold text-text-heading">Recent Activity</h2>
            </div>
            {activity.length > 0 ? (
              activity.map((a, i) => (
                <ActivityRow
                  key={a.id}
                  badge={a.badge}
                  badgeClass={badgeColors[a.badge_color] || badgeColors.blue}
                  text={a.text}
                  time={timeAgo(a.created_at)}
                  href={a.link_to}
                  isLast={i === activity.length - 1}
                />
              ))
            ) : (
              <div className="px-6 py-10 text-center text-sm text-text-muted">
                No activity yet. Complete your onboarding to get started!
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4.5 text-sm font-bold text-text-heading">Export Readiness</h3>
            <div className="flex flex-col gap-3.5">
              {readiness.map((r, i) => (
                <div key={i}>
                  <div className="mb-1.5 flex justify-between">
                    <span className="text-xs font-medium text-text-body">{r.label}</span>
                    <span className={`text-xs font-bold ${r.pct === 100 ? "text-success" : r.pct > 0 ? "text-artha-gold" : "text-text-muted"}`}>
                      {r.pct}%
                    </span>
                  </div>
                  <ProgressBar value={r.pct} color={r.pct === 100 ? "bg-success" : r.pct > 0 ? "bg-artha-gold" : "bg-subtle"} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-3.5 text-sm font-bold text-text-heading">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              {quickActions.map((q, i) => <QuickActionRow key={i} {...q} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
