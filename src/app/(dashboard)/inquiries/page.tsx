"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Check, HelpCircle, Shield, Package, RefreshCw } from "lucide-react";
import { AnimatedTabs } from "@/components/arthaflow/animated-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

interface Inquiry {
  id: string;
  buyer_country: string;
  buyer_flag: string | null;
  buyer_sector: string | null;
  buyer_active_since: string | null;
  product_name: string;
  hs_code: string | null;
  quantity: string | null;
  delivery_terms: string | null;
  timeline: string | null;
  certifications_required: string | null;
  budget_range: string | null;
  status: "new" | "responded" | "closed";
  priority: "high" | "medium" | "low";
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

const statusColors: Record<string, string> = {
  new: "text-action-blue",
  responded: "text-success",
  closed: "text-text-muted",
};

const statusLabels: Record<string, string> = {
  new: "New",
  responded: "Responded",
  closed: "Closed",
};

const priorityLabels: Record<string, string> = {
  high: "High Priority",
  medium: "Medium Priority",
  low: "Low Priority",
};

const filterTabs = ["All", "New", "Responded", "Closed"];

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: number }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-bg">
        <Package size={28} className="text-action-blue" />
      </div>
      <h3 className="mb-1.5 text-base font-bold text-text-heading">
        {tab === 0 ? "No inquiries yet" : `No ${filterTabs[tab].toLowerCase()} inquiries`}
      </h3>
      <p className="max-w-xs text-sm text-text-secondary">
        {tab === 0
          ? "ArthaFlow will connect you with verified global buyers once your product catalogue is complete."
          : `You have no ${filterTabs[tab].toLowerCase()} inquiries right now.`}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BuyerInquiriesPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [tab, setTab] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load inquiries
  const load = useCallback(async () => {
    // `loading` already starts true and this runs once on mount, so setting
    // it here only forced an extra synchronous render.
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error: err } = await supabase
      .from("inquiries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (err) { setError(err.message); setLoading(false); return; }
    setInquiries(data || []);
    // Functional form so this doesn't close over `selId`. Reading it directly
    // would force `selId` into the dep array, which would rebuild `load` — and
    // therefore refetch the whole list — every time the user clicks a row.
    if (data && data.length > 0) setSelId((cur) => cur ?? data[0].id);
    setLoading(false);
  }, [supabase]);

  // The loader is async and every setState in it runs after an await, so no
  // state is set during the effect's synchronous phase. The rule flags the
  // call because it cannot see across the await boundary; satisfying it
  // properly means a data library or Server Components, not a change here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // Filtered list
  const visible = inquiries.filter(
    (q) => tab === 0 || q.status === filterTabs[tab].toLowerCase()
  );

  const cur = inquiries.find((q) => q.id === selId) ?? visible[0] ?? null;

  // Count badges per tab
  const counts = [
    inquiries.length,
    inquiries.filter((q) => q.status === "new").length,
    inquiries.filter((q) => q.status === "responded").length,
    inquiries.filter((q) => q.status === "closed").length,
  ];

  // Update status
  async function updateStatus(id: string, status: "responded" | "closed") {
    setUpdating(true);
    // Scoped by user_id explicitly, not just the row id — RLS already
    // enforces this (migrations/001), but a mutation that only trusts RLS
    // has no backstop if a policy ever regresses.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setUpdating(false); return; }
    const { error: err } = await supabase
      .from("inquiries")
      .update({ status })
      .eq("id", id)
      .eq("user_id", user.id);
    if (err) { setError(err.message); setUpdating(false); return; }
    setInquiries((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status } : q))
    );
    setUpdating(false);
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px]">
        <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="border-r border-border bg-card px-6 pt-6">
            <Skeleton className="mb-5 h-7 w-40" />
            <Skeleton className="mb-4 h-8 w-full" />
            {[0, 1, 2].map((i) => <Skeleton key={i} className="mb-2 h-24 w-full rounded-none" />)}
          </div>
          <div className="bg-background p-8">
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const reqFields = cur
    ? [
        ["Product", `${cur.product_name}${cur.hs_code ? ` (HS ${cur.hs_code})` : ""}`],
        ["Quantity", cur.quantity || "—"],
        ["Delivery Terms", cur.delivery_terms || "—"],
        ["Timeline", cur.timeline || "—"],
        ["Certifications Required", cur.certifications_required || "—"],
        ["Budget Range", cur.budget_range || "—"],
      ]
    : [];

  return (
    <div className="mx-auto max-w-[1280px]">
      {error && (
        <div className="m-4 rounded-lg bg-red-bg px-4 py-3 text-sm text-error">
          {error}{" "}
          <button onClick={load} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* ── LEFT — list ─────────────────────────────────────────────────── */}
        <div className="border-r border-border bg-card">
          <div className="px-6 pt-6">
            <div className="mb-4.5 flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-text-heading">Buyer Inquiries</h1>
              {counts[1] > 0 && (
                <span className="rounded-md bg-blue-bg px-2 py-0.5 text-[11px] font-semibold text-action-blue">
                  {counts[1]} New
                </span>
              )}
              <button
                onClick={load}
                className="ml-auto text-text-muted transition-colors hover:text-text-body"
                title="Refresh"
              >
                <RefreshCw size={15} />
              </button>
            </div>
            <AnimatedTabs
              tabs={filterTabs.map((t, i) =>
                counts[i] > 0 && i > 0 ? `${t} (${counts[i]})` : t
              )}
              activeTab={tab}
              onChange={(i) => {
                setTab(i);
                // Select first item in new tab
                const first = inquiries.find(
                  (q) => i === 0 || q.status === filterTabs[i].toLowerCase()
                );
                if (first) setSelId(first.id);
              }}
            />
          </div>

          <div className="mt-1">
            {visible.length === 0 ? (
              <EmptyState tab={tab} />
            ) : (
              visible.map((q) => {
                const active = selId === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelId(q.id)}
                    className={`block w-full border-b border-subtle px-6 py-4 text-left transition-all ${
                      active
                        ? "border-l-[3px] border-l-action-blue bg-hover-blue"
                        : "border-l-[3px] border-l-transparent hover:bg-background"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-text-body">
                        {q.buyer_flag && (
                          <span className="text-[15px]">{q.buyer_flag}</span>
                        )}
                        {q.buyer_country}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {timeAgo(q.created_at)}
                      </span>
                    </div>
                    <div className="mb-0.5 text-sm font-semibold text-text-heading">
                      {q.product_name}
                    </div>
                    <div className="mb-2 text-[13px] text-text-secondary">
                      {q.quantity || "Quantity TBD"}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                        statusColors[q.status]
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusLabels[q.status]}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT — detail ──────────────────────────────────────────────── */}
        <div className="bg-background p-8">
          <AnimatePresence mode="wait">
            {cur ? (
              <motion.div
                key={cur.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                {/* Badges */}
                <div className="mb-4 flex gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      cur.status === "new"
                        ? "bg-blue-bg text-action-blue"
                        : cur.status === "responded"
                          ? "bg-green-bg text-success"
                          : "bg-subtle text-text-muted"
                    }`}
                  >
                    {statusLabels[cur.status]} Inquiry
                  </span>
                  <span className="rounded-md bg-gold-bg px-2 py-0.5 text-[11px] font-semibold text-[#92710A]">
                    {priorityLabels[cur.priority]}
                  </span>
                </div>

                {/* Header */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative flex h-8 w-8 items-center justify-center">
                    {cur.status === "new" && (
                      <motion.span
                        className="absolute inline-flex h-full w-full rounded-full bg-action-blue/30"
                        animate={{ scale: [1, 1.7, 1], opacity: [0.7, 0, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                    <span className="relative text-xl">
                      {cur.buyer_flag || "🌐"}
                    </span>
                  </div>
                  <h2 className="text-[22px] font-extrabold tracking-tight text-text-heading">
                    {cur.product_name} — {cur.buyer_country}
                  </h2>
                </div>

                {/* Buyer tags */}
                <div className="mb-5 flex flex-wrap gap-2">
                  {[
                    `Verified ${cur.buyer_country} Buyer`,
                    cur.buyer_sector,
                    cur.buyer_active_since,
                  ]
                    .filter(Boolean)
                    .map((b, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs text-text-secondary"
                      >
                        {b}
                      </span>
                    ))}
                </div>

                <div className="mb-5 h-px bg-border" />

                {/* Requirements */}
                <h3 className="mb-3.5 text-sm font-bold text-text-heading">
                  Requirements
                </h3>
                <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {reqFields.map(([label, value], i) => (
                    <div key={i}>
                      <div className="mb-0.5 text-xs text-text-secondary">
                        {label}
                      </div>
                      <div className="text-sm font-semibold text-text-heading">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mb-5 h-px bg-border" />

                {/* Actions */}
                {cur.status !== "closed" && (
                  <div className="mb-4 flex flex-wrap gap-3">
                    <Button
                      onClick={() => updateStatus(cur.id, "responded")}
                      disabled={updating || cur.status === "responded"}
                      variant={cur.status === "responded" ? "outline" : "default"}
                    >
                      {cur.status === "responded" && <Check size={16} />}
                      {cur.status === "responded"
                        ? "Interest Confirmed"
                        : "I'm Interested"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateStatus(cur.id, "closed")}
                      disabled={updating}
                    >
                      Not a Match
                    </Button>
                    <Button variant="ghost" className="text-action-blue">
                      <HelpCircle size={16} />
                      Ask ArthaFlow
                    </Button>
                  </div>
                )}
                {cur.status === "closed" && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-text-muted">
                    <span className="h-2 w-2 rounded-full bg-text-muted" />
                    This inquiry has been closed.
                  </div>
                )}

                {/* Privacy notice */}
                <div className="flex items-start gap-2 rounded-lg bg-gold-bg px-3.5 py-3 text-[13px] text-[#92710A]">
                  <Shield size={16} className="mt-0.5 shrink-0" />
                  ArthaFlow will connect you with the buyer after confirming mutual
                  interest. Buyer contact details stay private until both sides agree.
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-card"
              >
                <p className="text-sm text-text-muted">
                  Select an inquiry to view details
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
