"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Home,
  Package,
  Folder,
  User,
  ChevronRight,
  Zap,
  Upload,
  Code2,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

interface Notif {
  border: string;
  dot: string;
  title: string;
  sub: string;
  href: string;
}

interface StatItem {
  label: string;
  value: string;
  color: string;
}

// ── Bottom nav config ────────────────────────────────────────────────────────

const bottomNav = [
  { id: "home",     label: "Home",     icon: <Home size={22} />,    href: "/dashboard" },
  { id: "products", label: "Products", icon: <Package size={22} />, href: "/products" },
  { id: "docs",     label: "Docs",     icon: <Folder size={22} />,  href: "/documents" },
  { id: "profile",  label: "Profile",  icon: <User size={22} />,    href: "/settings" },
];

const quickActions = [
  { label: "Generate Docs", icon: <Zap size={15} />,    href: "/documents/generate" },
  { label: "Upload",        icon: <Upload size={15} />, href: "/documents" },
  { label: "HS Codes",      icon: <Code2 size={15} />,  href: "/documents/generate" },
  { label: "Help",          icon: <HelpCircle size={15} />, href: "/help" },
];

// ── Readiness score from profile ─────────────────────────────────────────────

/** The export-readiness fields this calculation reads. */
interface ReadinessProfile {
  has_iec?: boolean | null;
  ad_code_registered?: string | null;
  gst_number?: string | null;
}

function calcReadiness(
  p: ReadinessProfile | null | undefined,
  productCount: number
): number {
  const checks = [
    p?.has_iec === true,
    p?.ad_code_registered === "yes",
    productCount > 0,
    false,               // Certifications – placeholder
    !!p?.gst_number,
    false,               // Bank verified – placeholder
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ── Circular SVG ring ────────────────────────────────────────────────────────

function ReadinessRing({ score }: { score: number }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  const [dash, setDash] = useState(C);

  useEffect(() => {
    const t = setTimeout(() => setDash(C * (1 - score / 100)), 200);
    return () => clearTimeout(t);
  }, [C, score]);

  return (
    <div className="relative h-[84px] w-[84px]">
      <svg width="84" height="84" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="42" cy="42" r={R} fill="none" stroke="#163A6E" strokeWidth="7" />
        <circle
          cx="42" cy="42" r={R} fill="none"
          stroke="#2563EB" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={dash}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[26px] font-extrabold text-white">
        {score}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MobileDashboardPage() {
  const supabase = createClient();
  const [navTab, setNavTab] = useState("home");

  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("there");
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState<StatItem[]>([
    { label: "Readiness",  value: "—", color: "text-action-blue" },
    { label: "Inquiries",  value: "—", color: "text-artha-gold" },
    { label: "Documents",  value: "—", color: "text-success" },
    { label: "Shipments",  value: "—", color: "text-purple" },
  ]);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  const load = useCallback(async () => {
    // `loading` already starts true and this runs once on mount, so setting
    // it here only forced an extra synchronous render.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Profile
    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, has_iec, ad_code_registered, gst_number")
      .eq("id", user.id)
      .single();
    if (p?.full_name) setFirstName(p.full_name.split(" ")[0]);

    // Counts (id arrays — avoids HEAD request abort in dev)
    const [prodRes, docRes, inqRes, shipRes] = await Promise.all([
      supabase.from("products").select("id").eq("user_id", user.id),
      supabase.from("documents").select("id").eq("user_id", user.id),
      supabase.from("inquiries").select("id").eq("user_id", user.id).eq("status", "new"),
      supabase.from("shipments").select("id").eq("user_id", user.id),
    ]);
    const pc = prodRes.data?.length ?? 0;
    const dc = docRes.data?.length ?? 0;
    const ic = inqRes.data?.length ?? 0;
    const sc = shipRes.data?.length ?? 0;

    // Readiness
    const rs = calcReadiness(p, pc);
    setScore(rs);

    setStats([
      { label: "Readiness",  value: String(rs), color: "text-action-blue" },
      { label: "Inquiries",  value: String(ic),  color: "text-artha-gold" },
      { label: "Documents",  value: String(dc),  color: "text-success" },
      { label: "Shipments",  value: String(sc),  color: "text-purple" },
    ]);

    // Activity → notification cards
    const { data: acts } = await supabase
      .from("activity_log")
      .select("badge_color, text, link_to")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    const colorMap: Record<string, { border: string; dot: string }> = {
      blue:   { border: "border-l-action-blue", dot: "bg-action-blue" },
      green:  { border: "border-l-success",     dot: "bg-success" },
      gold:   { border: "border-l-artha-gold",  dot: "bg-artha-gold" },
      purple: { border: "border-l-purple",       dot: "bg-purple" },
      red:    { border: "border-l-error",        dot: "bg-error" },
    };

    setNotifs(
      (acts ?? []).map((a) => {
        const c = colorMap[a.badge_color] ?? colorMap.blue;
        return {
          border: c.border,
          dot:    c.dot,
          title:  a.badge_color === "green" ? "✅ Complete" : a.badge_color === "gold" ? "⭐ Update" : "📬 Notice",
          sub:    a.text,
          href:   a.link_to ?? "/dashboard",
        };
      })
    );

    setLoading(false);
  }, []);

  // The loader is async and every setState in it runs after an await, so no
  // state is set during the effect's synchronous phase. The rule flags the
  // call because it cannot see across the await boundary; satisfying it
  // properly means a data library or Server Components, not a change here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex min-h-screen justify-center bg-background">
      <div className="relative min-h-screen w-[390px] max-w-full bg-card shadow-[0_0_40px_rgba(0,0,0,0.06)]">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="rounded-b-3xl bg-navy pb-7">
          <div className="flex h-14 items-center justify-between px-4">
            <span className="text-[19px] font-extrabold text-artha-gold">ArthaFlow</span>
            <button
              onClick={load}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-white/10 text-white transition-opacity active:opacity-60"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex items-center justify-between px-5 pt-2">
            <div>
              <div className="text-[19px] font-bold text-white">
                {loading ? "Loading…" : `${greeting}, ${firstName}`}
              </div>
              <div className="mt-0.5 text-[13px] text-white/60">Export Readiness</div>
            </div>
            <ReadinessRing score={score} />
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div className="px-4 pb-24 pt-5">

          {/* Stats 2×2 */}
          <div className="mb-5 grid grid-cols-2 gap-3">
            {stats.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3.5">
                <div className={`text-2xl font-extrabold tracking-tight ${s.color}`}>
                  {loading ? "—" : s.value}
                </div>
                <div className="mt-0.5 text-[11px] text-text-secondary">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Notification / activity cards */}
          <div className="mb-5 flex flex-col gap-2.5">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-subtle" />
              ))
            ) : notifs.length > 0 ? (
              notifs.map((n, i) => (
                <Link
                  key={i}
                  href={n.href}
                  className={`flex items-center gap-3 rounded-xl border border-border ${n.border} border-l-[3px] bg-card p-3.5 transition-colors hover:bg-background`}
                >
                  <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-bold text-text-heading">{n.title}</div>
                    <div className="mt-0.5 truncate text-[13px] text-text-secondary">{n.sub}</div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-action-blue" />
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center">
                <p className="text-sm text-text-muted">No recent activity.</p>
                <Link href="/onboarding" className="mt-1 block text-[13px] font-medium text-action-blue hover:underline">
                  Complete onboarding to get started →
                </Link>
              </div>
            )}
          </div>

          {/* Quick actions — horizontal scroll */}
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Quick Actions
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {quickActions.map((q, i) => (
              <Link
                key={i}
                href={q.href}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-[13px] font-medium text-text-body transition-colors hover:bg-hover-blue hover:border-action-blue"
              >
                <span className="text-action-blue">{q.icon}</span>
                {q.label}
              </Link>
            ))}
          </div>

          {/* Export tip */}
          <div className="mt-5 rounded-xl bg-gradient-to-br from-navy to-royal-blue p-4">
            <p className="text-[13px] font-semibold text-artha-gold">💡 Export Tip</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/70">
              Add your IEC number and AD Code in Settings to boost your readiness score
              and get priority buyer matches.
            </p>
          </div>
        </div>

        {/* ── Bottom nav ───────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-1/2 flex h-16 w-[390px] max-w-full -translate-x-1/2 items-center justify-around rounded-t-2xl border-t border-border bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          {bottomNav.map((b) => (
            <Link
              key={b.id}
              href={b.href}
              onClick={() => setNavTab(b.id)}
              className={`flex min-w-[56px] flex-col items-center gap-0.5 p-1 transition-colors ${
                navTab === b.id ? "text-action-blue" : "text-text-muted"
              }`}
            >
              {b.icon}
              <span className={`text-[11px] ${navTab === b.id ? "font-semibold" : "font-medium"}`}>
                {b.label}
              </span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
