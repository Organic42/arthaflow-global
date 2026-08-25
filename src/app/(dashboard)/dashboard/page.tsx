"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, ArrowRight, Check, Search, Globe2, Newspaper } from "lucide-react";
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

/**
 * One step of export readiness.
 *
 * BINARY, AND ALL OF IT REACHABLE. The previous model scored six items and
 * averaged them, but "Bank Verified" was hardcoded to 0 with no column behind
 * it anywhere in the app (mobile/page.tsx still calls it a placeholder), and
 * the catalogue step capped at 75. A manufacturer who did everything ArthaFlow
 * can actually check topped out at 79/100 with no way to move it — on the one
 * number the dashboard leads with. Now five steps, each verifiable, each worth
 * the same, and 100% genuinely means finished.
 *
 * An AD Code is issued by a bank against your IEC, so tracking that step
 * already covers the banking relationship the sixth item was gesturing at.
 */
interface ReadinessStep {
  label: string;
  done: boolean;
  /** Where the user goes to finish it. */
  href: string;
  /** What to actually do. Shown only while the step is outstanding. */
  todo: string;
}

/** The old greeting said "Good morning" at every hour of the day. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Replaces "Quick Actions", which were four links to pages already listed in
 * the sidebar two inches to the left. These are the things the product does
 * that nothing else does, and none of them were reachable from the dashboard.
 */
const TOOLS = [
  {
    label: "Price a product into any market",
    detail: "Duty, VAT, RoDTEP and drawback from one search",
    href: "/tools",
    Icon: Search,
  },
  {
    label: "Rank 80 markets at once",
    detail: "See where your product lands cheapest for a buyer",
    href: "/tools",
    Icon: Globe2,
  },
  {
    label: "What changed this year",
    detail: "US tariff cut, RoDTEP extension, CETA origin rules",
    href: "/blog",
    Icon: Newspaper,
  },
];

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [stats, setStats] = useState({ products: 0, documents: 0, inquiries: 0, shipments: 0 });
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [readiness, setReadiness] = useState<ReadinessStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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

    // Readiness. Every step is binary and every step is reachable — see the
    // note on ReadinessStep for why "Bank Verified" and the 75% catalogue are
    // gone.
    if (p) {
      setReadiness([
        {
          label: "Importer Exporter Code",
          done: Boolean(p.has_iec),
          href: "/settings",
          todo: "Add your IEC in Settings — nothing ships without it.",
        },
        {
          label: "AD Code",
          done: p.ad_code_registered === "yes",
          href: "/settings",
          // "Not sure" is a real answer in onboarding and it is not a yes.
          todo:
            p.ad_code_registered === "not_sure" || p.ad_code_registered === "Not Sure"
              ? "You answered “not sure”. Ask your bank whether your AD Code is registered, then confirm it here."
              : "Register an AD Code with your bank — customs will not clear a shipment without one.",
        },
        {
          label: "GST number",
          done: Boolean(p.gst_number),
          href: "/settings",
          todo: "Add your GSTIN so refunds can be claimed against your shipments.",
        },
        {
          label: "Product catalogue",
          done: productCount > 0,
          href: "/products",
          todo: "Add at least one product so it can be classified and quoted.",
        },
        {
          label: "Certifications",
          done: hasCertifications,
          href: "/products",
          todo: "Add a certification to a product — most buyers ask before they order.",
        },
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
  }, [supabase]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);


  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <Skeleton className="mb-6 h-9 w-72" />
        <Skeleton className="mb-5 h-52 rounded-2xl" />
        <Skeleton className="mb-5 h-16 rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const done = readiness.filter((r) => r.done);
  const outstanding = readiness.filter((r) => !r.done);
  const pct = readiness.length ? Math.round((done.length / readiness.length) * 100) : 0;

  const counts = [
    { label: "products", value: stats.products, href: "/products" },
    { label: "documents", value: stats.documents, href: "/documents" },
    { label: "new inquiries", value: stats.inquiries, href: "/inquiries" },
    { label: "shipments", value: stats.shipments, href: "/shipments" },
  ];

  return (
    // No padding here on purpose: the dashboard layout's <main> already applies
    // p-6/p-8 and this page added its own on top, so every screen was inset
    // twice and the content sat stranded in the middle of a wide monitor.
    <div className="mx-auto max-w-[1400px]">
      {error && (
        <div className="mb-5 rounded-lg bg-red-bg px-4 py-3 text-sm text-error">
          {error}{" "}
          <button onClick={load} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-text-heading">
            {greeting()}, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {outstanding.length === 0
              ? "You are export ready. Price a product and pick a market."
              : `${outstanding.length} ${outstanding.length === 1 ? "thing" : "things"} left before you can ship.`}
          </p>
        </div>
        <Link href="/documents/generate">
          <Button>
            <Zap size={16} /> Generate export docs
          </Button>
        </Link>
      </div>

      {/* ══ READINESS ═══════════════════════════════════════════════════════
          One object instead of two. The score used to sit in a stat card at
          the top of the page while the six bars driving it sat in a sidebar
          panel — so the number and its causes were never read together, and
          neither half was clickable. Every outstanding step is now a link to
          the screen that clears it. */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-1 gap-8 p-7 lg:grid-cols-[210px_minmax(0,1fr)] lg:items-center">
          <div className="flex items-center gap-5">
            <Ring pct={pct} />
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-text-muted">
                Export readiness
              </div>
              <div className="mt-1 text-[15px] font-semibold text-text-heading">
                {done.length} of {readiness.length} done
              </div>
            </div>
          </div>

          <div>
            {outstanding.length > 0 ? (
              <>
                <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-text-muted">
                  Still to do
                </div>
                <ul className="flex flex-col">
                  {outstanding.map((r) => (
                    <li key={r.label}>
                      <Link
                        href={r.href}
                        className="group flex items-start gap-4 rounded-lg border-b border-border px-3 py-3 transition-colors last:border-b-0 hover:bg-subtle"
                      >
                        <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-artha-gold" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold text-text-heading">
                            {r.label}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">
                            {r.todo}
                          </span>
                        </span>
                        <ArrowRight
                          size={15}
                          className="mt-1.5 shrink-0 text-text-muted transition-transform motion-safe:group-hover:translate-x-1"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[14px] leading-relaxed text-text-body">
                Every step ArthaFlow can verify is complete. Nothing here is blocking a
                shipment.
              </p>
            )}

            {done.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-4">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-text-muted">
                  Done
                </span>
                {done.map((r) => (
                  <span
                    key={r.label}
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-text-secondary"
                  >
                    <Check size={12} className="text-success" strokeWidth={3} />
                    {r.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ COUNTS ══════════════════════════════════════════════════════════
          Demoted from four large stat cards to one strip. These are inventory,
          not decisions — at equal weight they competed with the readiness
          score for the eye while giving a manufacturer nothing to act on. */}
      <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:grid-cols-4">
        {counts.map((c, i) => (
          <Link
            key={c.label}
            href={c.href}
            className={`flex items-baseline gap-2 px-5 py-4 transition-colors hover:bg-subtle ${
              i % 2 === 0 ? "border-r border-border" : ""
            } ${i < 2 ? "border-b border-border sm:border-b-0" : ""} ${
              i === 1 ? "sm:border-r sm:border-border" : ""
            }`}
          >
            <span className="font-mono text-[1.6rem] font-bold leading-none text-text-heading">
              {c.value}
            </span>
            <span className="text-[13px] text-text-secondary">{c.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-[15px] font-bold text-text-heading">Recent activity</h2>
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
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-text-secondary">Nothing has happened yet.</p>
              <p className="mt-1 text-[13px] text-text-muted">
                Add a product or generate a document and it will show up here.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-[15px] font-bold text-text-heading">Your export tools</h2>
          <div className="flex flex-col gap-0.5">
            {TOOLS.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-subtle"
              >
                <t.Icon size={16} className="mt-0.5 shrink-0 text-action-blue" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-text-heading">
                    {t.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-text-secondary">
                    {t.detail}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * The readiness ring.
 *
 * An arc rather than the old stack of six bars because this is the number the
 * page is built around and it has to read from across a desk. The dash length
 * is computed from the real circumference, so the arc is the percentage rather
 * than an approximation of it.
 */
function Ring({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[84px] w-[84px] shrink-0">
      <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="42" cy="42" r={r} fill="none" strokeWidth="7" className="stroke-subtle" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          className={pct === 100 ? "stroke-success" : "stroke-artha-gold"}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[1.35rem] font-bold text-text-heading">
        {pct}%
      </span>
    </div>
  );
}
