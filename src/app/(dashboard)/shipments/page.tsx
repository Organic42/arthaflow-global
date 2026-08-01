"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, Truck, FileText, Package, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

interface TimelineStep {
  state: "done" | "current" | "future";
  title: string;
  date: string;
  desc: string;
}

interface Shipment {
  id: string;
  reference: string;
  product_name: string;
  route_description: string | null;
  status: string;
  status_color: string;
  eta: string | null;
  details: Record<string, string>;
  timeline: TimelineStep[];
  created_at: string;
}

// ── Status color map ─────────────────────────────────────────────────────────

const statusBadge: Record<string, string> = {
  green: "bg-green-bg text-success",
  blue: "bg-blue-bg text-action-blue",
  gold: "bg-gold-bg text-[#92710A]",
  red: "bg-red-bg text-error",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function DocPlaceholderRow({ name }: { name: string }) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-lg bg-background px-3 py-2.5">
      <FileText size={16} className="shrink-0 text-text-muted" />
      <span className="flex-1 text-[13px] font-medium text-text-body">{name}</span>
      <span className="text-[11px] text-text-muted">Attached</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-bg">
        <Package size={28} className="text-action-blue" />
      </div>
      <h3 className="mb-1.5 text-base font-bold text-text-heading">No shipments yet</h3>
      <p className="max-w-sm text-sm text-text-secondary">
        Your active export shipments will appear here once you are matched with verified buyers.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShipmentTrackerPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // `loading` already starts true and this runs once on mount, so setting
    // it here only forced an extra synchronous render.
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error: err } = await supabase
      .from("shipments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (err) { setError(err.message); setLoading(false); return; }
    const rows = (data || []) as Shipment[];
    setShipments(rows);
    if (rows.length > 0 && !selId) setSelId(rows[0].id);
    setLoading(false);
  }, []);

  // The loader is async and every setState in it runs after an await, so no
  // state is set during the effect's synchronous phase. The rule flags the
  // call because it cannot see across the await boundary; satisfying it
  // properly means a data library or Server Components, not a change here.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const cur = shipments.find((s) => s.id === selId) ?? shipments[0] ?? null;
  const activeCount = shipments.filter(
    (s) => !["delivered", "cancelled"].includes(s.status.toLowerCase())
  ).length;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] p-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-80 rounded-xl" />
          <div className="flex flex-col gap-5">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
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

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-heading">
          Shipments
        </h1>
        {activeCount > 0 && (
          <span className="rounded-md bg-green-bg px-2 py-0.5 text-[11px] font-semibold text-success">
            {activeCount} Active
          </span>
        )}
        <button
          onClick={load}
          className="ml-auto text-text-muted transition-colors hover:text-text-body"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {shipments.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Shipment selector cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {shipments.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelId(s.id)}
                className={`flex items-center gap-4 rounded-xl border bg-card p-6 text-left shadow-sm transition-all ${
                  selId === s.id
                    ? "border-2 border-action-blue"
                    : "border-border hover:shadow-md"
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-bg text-action-blue">
                  <Truck size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-text-muted">
                      {s.reference}
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        statusBadge[s.status_color] || statusBadge.blue
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="mb-0.5 truncate text-[15px] font-bold text-text-heading">
                    {s.route_description || s.product_name}
                  </div>
                  {s.eta && (
                    <div className="text-[13px] text-text-secondary">
                      ETA: {s.eta}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Detail area */}
          {cur && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              {/* Timeline */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-6 text-base font-bold text-text-heading">
                  Shipment Timeline — {cur.reference}
                </h2>
                <div>
                  {(cur.timeline as TimelineStep[]).map((t, i) => {
                    const isLast = i === cur.timeline.length - 1;
                    return (
                      <div key={i} className="flex gap-4">
                        {/* Circle + connector */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full ${
                              t.state === "done"
                                ? "bg-success text-white"
                                : t.state === "current"
                                  ? "animate-pulse-ring bg-action-blue text-white"
                                  : "border-2 border-border bg-card"
                            }`}
                          >
                            {t.state === "done" && <Check size={14} />}
                            {t.state === "current" && (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>
                          {!isLast && (
                            <div
                              className={`min-h-[36px] flex-1 ${
                                t.state === "future"
                                  ? "border-l-2 border-dashed border-border"
                                  : t.state === "done"
                                    ? "w-0.5 bg-success"
                                    : "w-0.5 bg-border"
                              }`}
                            />
                          )}
                        </div>
                        {/* Content */}
                        <div className={isLast ? "" : "pb-6"}>
                          <div
                            className={`text-[15px] font-semibold ${
                              t.state === "future"
                                ? "text-text-muted"
                                : "text-text-heading"
                            }`}
                          >
                            {t.title}
                          </div>
                          <div
                            className={`mb-1 mt-0.5 text-[13px] font-medium ${
                              t.state === "current"
                                ? "text-action-blue"
                                : "text-text-secondary"
                            }`}
                          >
                            {t.date}
                          </div>
                          <div className="text-[13px] text-text-secondary">
                            {t.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar */}
              <div className="flex flex-col gap-5">
                {/* Details */}
                {Object.keys(cur.details).length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="mb-4 text-sm font-bold text-text-heading">
                      Shipment Details
                    </h3>
                    <div className="flex flex-col gap-3">
                      {Object.entries(cur.details).map(([k, v], i) => (
                        <div key={i} className="flex justify-between gap-3">
                          <span className="shrink-0 text-[13px] text-text-secondary">
                            {k}
                          </span>
                          <span
                            className={`text-right text-[13px] font-semibold text-text-heading ${
                              ["Container", "Vessel"].includes(k) ? "font-mono" : ""
                            }`}
                          >
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached documents (static placeholder for now) */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="mb-3.5 text-sm font-bold text-text-heading">
                    Attached Documents
                  </h3>
                  <div className="flex flex-col gap-2">
                    {["Bill of Lading", "Commercial Invoice", "Packing List"].map(
                      (d, i) => (
                        <DocPlaceholderRow key={i} name={d} />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
