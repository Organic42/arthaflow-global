"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Info, AlertTriangle, HelpCircle } from "lucide-react";

/**
 * Public HSN code search.
 *
 * Same retrieve-then-choose flow as /calculator: search returns a shortlist,
 * the user picks the Indian tariff line, and every figure below it — GST,
 * RoDTEP, Duty Drawback, export policy — comes from bundled government data.
 * Zero live API calls: everything here is a lookup into JSON shipped with the
 * app, not a request to any external service.
 *
 * BCD (Basic Customs Duty) is deliberately absent. Unlike GST, which got a
 * single consolidated notification with GST 2.0, BCD has no equivalent — it
 * is spread across ~98 separate chapter notifications that Parliament amends
 * most Budgets, with no one document to build from. Showing a number here
 * would mean showing one we can't stand behind, so the page says so instead
 * of guessing.
 */

interface LineSummary {
  code: string;
  description: string;
  policy: string;
}
interface Candidate {
  code: string;
  description: string;
  lines: LineSummary[];
}

interface GstCandidate {
  rate: number;
  schedule: string;
  matchedPrefix: string;
}
interface GstDetail {
  unambiguous: boolean;
  isCatchAll: boolean;
  candidates: GstCandidate[];
  description: string;
}
interface RodtepDetail {
  notifiedRatePct: number;
  capPerUnitInr: number | null;
  unit: string;
  description: string;
}
interface DrawbackItem {
  drawbackItem: string;
  description: string;
  ratePct: number;
  capPerUnitInr: number | null;
  unit: string;
}
interface DrawbackDetail {
  heading: string;
  items: DrawbackItem[];
  unambiguous: boolean;
  description: string;
}
interface LineDetail {
  code: string;
  description: string;
  unit: string;
  hsParent: string;
  policy: string;
  condition: string;
  gst: GstDetail;
  rodtep: RodtepDetail | null;
  drawback: DrawbackDetail | null;
}

export default function HsnSearchPage() {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [lineCode, setLineCode] = useState<string | null>(null);

  const [searching, setSearching] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LineDetail | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setDetail(null);
    setPicked(null);
    setLineCode(null);
    try {
      const r = await fetch(`/api/hsn-search?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Search failed.");
      const list: Candidate[] = d.candidates ?? [];
      setCandidates(list);
      // A bare code always resolves to exactly one candidate — jump straight
      // to it instead of making the user click through a shortlist of one.
      if (list.length === 1) {
        selectCandidate(list[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function selectCandidate(c: Candidate) {
    setPicked(c);
    setDetail(null);
    const only = c.lines.length === 1 ? c.lines[0] : null;
    setLineCode(only?.code ?? null);
    if (only) loadDetail(only.code);
  }

  async function loadDetail(code: string) {
    setLineCode(code);
    setLoadingDetail(true);
    setError(null);
    setDetail(null);
    try {
      const r = await fetch(`/api/hsn-search?code=${code}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Lookup failed.");
      setDetail(d.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLoadingDetail(false);
    }
  }

  const restricted = detail && detail.policy !== "Free";

  return (
    <section className="min-h-[70vh] bg-background px-6 pb-24 pt-14 sm:px-8">
      <div className="mx-auto max-w-[880px]">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-text-heading sm:text-4xl">
            HSN Code Search
          </h1>
          <p className="mx-auto max-w-[560px] text-base text-text-secondary">
            GST rate, export policy, RoDTEP and Duty Drawback for any product or
            HSN code. Free, no sign-up, no live lookups — every figure is bundled
            government data.
          </p>
        </div>

        {/* ── Step 1: find the code ── */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-artha-gold text-[12px] font-bold text-navy">
              1
            </span>
            <h2 className="text-base font-bold text-text-heading">
              Search a product or an HSN code
            </h2>
          </div>
          <form onSubmit={search} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. leather handbags, 420221, brass door handles"
              className="h-10"
            />
            <Button type="submit" disabled={searching} className="h-10 shrink-0 gap-1.5">
              <Search size={15} />
              {searching ? "Searching…" : "Search"}
            </Button>
          </form>

          {candidates && candidates.length === 0 && (
            <p className="mt-3 text-sm text-text-secondary">
              No match. Try the material and what the product is used for, or a
              2-8 digit HSN code directly.
            </p>
          )}

          {candidates && candidates.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-[13px] text-text-secondary">
                Pick the closest match. We never choose for you — every figure
                below depends on this code.
              </p>
              <div className="flex flex-col gap-2">
                {candidates.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => selectCandidate(c)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      picked?.code === c.code
                        ? "border-artha-gold bg-gold-bg"
                        : "border-border hover:border-artha-gold/50"
                    }`}
                  >
                    <span className="font-mono font-bold text-text-heading">
                      {c.code}
                    </span>{" "}
                    <span className="text-text-body">{c.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Indian tariff line picker — only shown when there's a real choice. */}
          {picked && picked.lines.length > 1 && (
            <div className="mt-4 border-t border-border pt-4">
              <label className="mb-1.5 block text-[13px] font-medium text-text-heading">
                Indian tariff line (8-digit, goes on your shipping bill)
              </label>
              <select
                value={lineCode ?? ""}
                onChange={(e) => loadDetail(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Choose the tariff line…
                </option>
                {picked.lines.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code} — {l.description}
                    {l.policy !== "Free" ? ` [${l.policy}]` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {picked && picked.lines.length === 0 && (
            <p className="mt-4 border-t border-border pt-4 text-sm text-text-secondary">
              DGFT&apos;s export schedule lists no 8-digit tariff line under HS{" "}
              {picked.code}. The 6-digit code stands; confirm the tariff line
              with DGFT or a customs broker.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {loadingDetail && (
          <p className="mb-6 text-center text-sm text-text-secondary">
            Looking up…
          </p>
        )}

        {/* ── Step 2: the answer ── */}
        {detail && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-artha-gold text-[12px] font-bold text-navy">
                2
              </span>
              <h2 className="text-base font-bold text-text-heading">
                HS {detail.code} — {detail.description}
              </h2>
            </div>

            {restricted && (
              <p className="mb-5 flex items-start gap-1.5 rounded-lg bg-red-50 p-2.5 text-[13px] text-red-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>
                  This line is <strong>{detail.policy}</strong> for export
                  {detail.condition ? ` — ${detail.condition}` : ""}. Confirm the
                  current position with DGFT or a customs broker before shipping;
                  policy is amended by notification.
                </span>
              </p>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* GST */}
              <div className="rounded-xl border border-border p-4">
                <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-text-secondary">
                  GST rate
                </h3>
                {detail.gst.unambiguous ? (
                  <p className="text-2xl font-extrabold text-text-heading">
                    {detail.gst.candidates[0].rate}%
                  </p>
                ) : (
                  <p className="text-lg font-extrabold text-text-heading">
                    {detail.gst.candidates.map((c) => `${c.rate}%`).join(" or ")}
                  </p>
                )}
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-secondary">
                  {detail.gst.description}
                </p>
              </div>

              {/* RoDTEP */}
              <div className="rounded-xl border border-border p-4">
                <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-text-secondary">
                  RoDTEP rebate
                </h3>
                {detail.rodtep ? (
                  <>
                    <p className="text-2xl font-extrabold text-text-heading">
                      {detail.rodtep.notifiedRatePct}%{" "}
                      <span className="text-sm font-medium text-text-secondary">
                        of FOB
                      </span>
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-secondary">
                      {detail.rodtep.description}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary">
                    No RoDTEP rate notified for this tariff line.
                  </p>
                )}
              </div>

              {/* Duty Drawback */}
              <div className="rounded-xl border border-border p-4 sm:col-span-2">
                <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-text-secondary">
                  Duty Drawback
                </h3>
                {detail.drawback ? (
                  <>
                    {detail.drawback.unambiguous ? (
                      <p className="text-2xl font-extrabold text-text-heading">
                        {detail.drawback.items[0].ratePct}%{" "}
                        <span className="text-sm font-medium text-text-secondary">
                          of FOB
                        </span>
                      </p>
                    ) : (
                      <p className="text-lg font-extrabold text-text-heading">
                        {detail.drawback.items.map((i) => `${i.ratePct}%`).join(" / ")}
                      </p>
                    )}
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-secondary">
                      {detail.drawback.description}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary">
                    No Duty Drawback entry for HS heading {detail.code.slice(0, 4)}.
                  </p>
                )}
              </div>
            </div>

            {/* BCD — deliberately absent, said plainly rather than omitted silently. */}
            <div className="mt-5 rounded-xl bg-background p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-text-heading">
                <HelpCircle size={14} />
                Basic Customs Duty (BCD) — not shown here
              </div>
              <p className="text-[12.5px] leading-relaxed text-text-secondary">
                Unlike GST, which was consolidated into one notification under
                GST 2.0, BCD has no single official source — it is spread across
                roughly 98 separate chapter notifications that Parliament
                typically amends every Budget. Rather than show a number we
                can&apos;t stand behind, check your product&apos;s BCD with the{" "}
                <a
                  href="https://www.cbic.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-artha-gold"
                >
                  CBIC customs tariff
                </a>{" "}
                or a customs broker. (BCD applies to imports in any case — as an
                exporter it does not fall on you, though it affects the landed
                cost of any imported inputs you use.)
              </p>
            </div>

            <div className="mt-5 flex items-start gap-1.5 rounded-xl bg-background p-4 text-[12.5px] leading-relaxed text-text-secondary">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>
                All figures are bundled from official notifications and updated
                periodically — not fetched live. Rates change by notification;
                confirm the current position before shipping or filing.
              </span>
            </div>

            <div className="mt-5 flex flex-col items-center gap-2 border-t border-border pt-5 text-center">
              <p className="text-sm text-text-secondary">
                Want the landed cost in a destination market too?
              </p>
              <Link href="/calculator">
                <Button className="gap-1.5 bg-artha-gold text-navy hover:bg-artha-gold/90">
                  Open the Landed Cost Calculator <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-[12px] leading-relaxed text-text-muted">
          Tariff lines and export policy from DGFT ITC(HS) 2022. GST from
          Notification 9/2025-Integrated Tax (Rate), effective 22.09.2025.
          RoDTEP from DGFT Appendix 4R. Duty Drawback from CBIC 77/2023-Cus
          (N.T.). Rates change by notification — confirm with a customs broker
          before shipping.
        </p>
      </div>
    </section>
  );
}
