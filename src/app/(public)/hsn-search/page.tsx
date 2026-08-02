"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, AlertTriangle, CornerDownLeft, Loader2 } from "lucide-react";

/**
 * Public HSN code search — a two-pane reference instrument.
 *
 * LAYOUT: results rail on the left, the resolved line on the right, side by
 * side and sticky. The previous version was a vertical wizard — submit, pick a
 * heading, pick a line, scroll to the answer — three clicks and a scroll before
 * any payoff, in a stack of identical white cards. Here the answer sits beside
 * the query and updates in place.
 *
 * SEARCH IS LIVE: debounced as you type, with the heading/line pick flattened
 * into one list of real 8-digit tariff lines. Requests are aborted on each
 * keystroke so a slow early response can't overwrite a newer one.
 *
 * THE PANEL IS DARK ON PURPOSE: this is an instrument for reading official
 * data, and the navy panel gives the numbers somewhere to sit that isn't
 * another white card. It also lets the gold India digits carry real weight.
 *
 * THE RULE THIS PAGE IS BUILT ON, UNCHANGED: settled values look singular,
 * unsettled values look plural. gst.ts and drawback.ts refuse to collapse a
 * genuine ambiguity into one number — chapter 61's GST really is 5% or 18%, and
 * a drawback rate cannot be pinned to an ITC-HS line — so an unsettled figure is
 * never given the single-number treatment. BCD is absent and the page says why.
 */

interface LineHit {
  code: string;
  description: string;
  policy: string;
  parent: string;
}

interface CodeLevel {
  digits: string;
  at: string;
  level: string;
  title: string;
  indian: boolean;
}
interface GstCandidate { rate: number; schedule: string; matchedPrefix: string }
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
  levels: CodeLevel[];
  policy: string;
  condition: string;
  gst: GstDetail;
  rodtep: RodtepDetail | null;
  drawback: DrawbackDetail | null;
}

const EXAMPLES = ["leather handbags", "basmati rice", "brass door handles", "61091000"];

/** Policy tone on the dark panel. */
const POLICY_TONE: Record<string, string> = {
  Free: "text-[#6EE7B7]",
  Restricted: "text-[#FBBF24]",
  STE: "text-[#FBBF24]",
  Prohibited: "text-[#FCA5A5]",
};

export default function HsnSearchPage() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LineHit[] | null>(null);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<LineDetail | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAbort = useRef<AbortController | null>(null);
  const detailAbort = useRef<AbortController | null>(null);
  const railRef = useRef<HTMLUListElement>(null);

  const load = useCallback(async (code: string) => {
    setSelected(code);
    setLoadingDetail(true);
    setError(null);
    detailAbort.current?.abort();
    const ac = new AbortController();
    detailAbort.current = ac;
    try {
      const r = await fetch(`/api/hsn-search?code=${code}`, { signal: ac.signal });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Lookup failed.");
      setDetail(d.data);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Lookup failed.");
      }
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ── Live search, debounced ────────────────────────────────────────────────
  // Every state write lives inside the timeout, not the effect body: React's
  // set-state-in-effect rule rejects the synchronous path, and deferring the
  // spinner until the request actually starts is the better behaviour anyway.
  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(async () => {
      if (!q) {
        setHits(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchAbort.current?.abort();
      const ac = new AbortController();
      searchAbort.current = ac;
      try {
        const r = await fetch(`/api/hsn-search?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const d = await r.json();
        // Flatten heading -> line into one list: the two-step pick was a click
        // the user never had a reason to make.
        const flat: LineHit[] = [];
        for (const c of d.candidates ?? []) {
          for (const l of c.lines ?? []) {
            flat.push({
              code: l.code,
              description: l.description,
              policy: l.policy,
              parent: c.code,
            });
          }
          if (flat.length >= 40) break;
        }
        setHits(flat);
        setActive(0);
        if (flat.length === 1) load(flat[0].code);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Search failed. Try again.");
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, load]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!hits || hits.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next =
        e.key === "ArrowDown"
          ? Math.min(active + 1, hits.length - 1)
          : Math.max(active - 1, 0);
      setActive(next);
      railRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      load(hits[active].code);
    }
  }

  return (
    <section className="min-h-[70vh] bg-background px-5 pb-20 pt-10 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
              ITC(HS) 2022 · Free · No sign-up
            </p>
            <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-text-heading sm:text-[2.25rem]">
              Know what your HSN code actually says
            </h1>
          </div>
          <p className="max-w-[38ch] text-[13.5px] leading-relaxed text-text-secondary">
            Tariff line, GST, and what you claim back on export. Where the rules
            genuinely don&apos;t settle on one number, you get all of them.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
          {/* ── Rail: live search + flattened tariff lines ── */}
          <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-6">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="leather handbags — or 42022110"
                aria-label="Search a product or HSN code"
                role="combobox"
                aria-expanded={!!hits?.length}
                aria-controls="hsn-results"
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-input bg-transparent pl-9 pr-9 text-[14px] outline-none transition-colors focus-visible:border-artha-gold focus-visible:ring-2 focus-visible:ring-artha-gold/35"
              />
              {searching && (
                <Loader2
                  size={15}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-text-muted"
                />
              )}
            </div>

            {!hits && (
              <div className="mt-4">
                <p className="mb-2 text-[12.5px] text-text-secondary">
                  Start typing, or try one of these.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setQuery(ex)}
                      className="cursor-pointer rounded-full border border-border px-2.5 py-1 font-mono text-[11.5px] text-text-body transition-colors hover:border-artha-gold hover:bg-gold-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hits && hits.length === 0 && !searching && (
              <p className="mt-4 text-[13px] leading-relaxed text-text-secondary">
                Nothing matched <span className="font-medium">{query}</span>. The
                nomenclature is written by material and use — try{" "}
                <button
                  type="button"
                  onClick={() => setQuery("leather bags")}
                  className="cursor-pointer underline underline-offset-2 hover:text-artha-gold"
                >
                  leather bags
                </button>{" "}
                rather than a brand or model name, or paste a 2–8 digit code.
              </p>
            )}

            {hits && hits.length > 0 && (
              <>
                <div className="mt-4 flex items-center justify-between px-0.5">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted">
                    {hits.length} tariff line{hits.length > 1 ? "s" : ""}
                  </span>
                  <span className="hidden items-center gap-1 font-mono text-[10.5px] text-text-muted sm:flex">
                    ↑↓ <CornerDownLeft size={11} />
                  </span>
                </div>
                <ul
                  id="hsn-results"
                  ref={railRef}
                  role="listbox"
                  aria-label="Matching tariff lines"
                  className="mt-1.5 max-h-[52vh] overflow-y-auto"
                >
                  {hits.map((h, i) => {
                    const isSel = selected === h.code;
                    return (
                      <li key={h.code} role="option" aria-selected={isSel}>
                        <button
                          type="button"
                          onClick={() => load(h.code)}
                          onMouseEnter={() => setActive(i)}
                          className={`w-full cursor-pointer rounded-lg border-l-2 px-2.5 py-2 text-left transition-colors ${
                            isSel
                              ? "border-l-artha-gold bg-gold-bg"
                              : i === active
                                ? "border-l-artha-gold/40 bg-subtle"
                                : "border-l-transparent hover:bg-subtle"
                          } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold`}
                        >
                          <span className="flex items-baseline gap-2">
                            <span className="font-mono text-[12.5px] font-bold tabular-nums text-text-heading">
                              <span className="text-text-muted">{h.code.slice(0, 6)}</span>
                              {h.code.slice(6)}
                            </span>
                            {h.policy !== "Free" && (
                              <span className="rounded-full bg-gold-bg px-1.5 text-[10px] font-semibold text-[#92400E]">
                                {h.policy}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-text-body">
                            {h.description}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </aside>

          {/* ── Panel: the resolved line ── */}
          <div className="min-h-[420px]">
            {error && (
              <div className="mb-4 rounded-xl bg-red-bg p-4 text-sm text-[#991B1B] dark:text-[#FCA5A5]">
                {error}
              </div>
            )}
            {loadingDetail && !detail ? (
              <Placeholder loading />
            ) : detail ? (
              <Docket detail={detail} />
            ) : (
              <Placeholder />
            )}
          </div>
        </div>

        <p className="mt-8 text-[12px] leading-relaxed text-text-muted">
          Tariff lines and export policy from DGFT ITC(HS) 2022. GST from
          Notification 9/2025-Integrated Tax (Rate), effective 22.09.2025. RoDTEP
          from DGFT Appendix 4R. Duty Drawback from CBIC 77/2023-Cus (N.T.).
          Bundled and updated periodically, never fetched live. Rates change by
          notification — confirm before you ship or file.
        </p>
      </div>
    </section>
  );
}

/* ── Empty / loading panel ───────────────────────────────────────────────── */

/** An empty pane is an invitation: this one teaches what the 8 digits mean. */
function Placeholder({ loading }: { loading?: boolean }) {
  const anatomy: Array<[string, string, string]> = [
    ["42", "Chapter", "the broad family — leather goods"],
    ["02", "Heading", "the article — cases, bags, containers"],
    ["21", "Subheading", "the material — outer surface of leather"],
    ["10", "Tariff line", "India's own split — hand-bags for ladies"],
  ];
  return (
    <div className="flex min-h-[420px] flex-col justify-center rounded-2xl border border-border bg-navy px-6 py-10 sm:px-9">
      {loading ? (
        <p className="text-center font-mono text-[13px] text-white/60">Resolving…</p>
      ) : (
        <>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/50">
            Anatomy of a code
          </p>
          <p className="mt-2 max-w-[40ch] text-[15px] leading-relaxed text-white/75">
            An HSN code isn&apos;t one number — it&apos;s four decisions, each
            narrowing the last. Search on the left to resolve yours.
          </p>
          <ol className="mt-6 space-y-2.5">
            {anatomy.map(([d, level, meaning], i) => (
              <li key={level} className="flex gap-3" style={{ paddingLeft: `${i * 16}px` }}>
                <span
                  className={`w-7 shrink-0 font-mono text-[15px] font-bold tabular-nums ${
                    i === 3 ? "text-artha-gold" : "text-white"
                  }`}
                >
                  {d}
                </span>
                <span className="min-w-0 border-l border-white/15 pl-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
                    {level}
                  </span>
                  <span className="block text-[13px] leading-snug text-white/70">
                    {meaning}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-[12px] text-white/60">
            The first six digits are the same worldwide.{" "}
            <span className="text-artha-gold">The last two are India&apos;s.</span>
          </p>
        </>
      )}
    </div>
  );
}

/* ── The docket ──────────────────────────────────────────────────────────── */

function Docket({ detail }: { detail: LineDetail }) {
  const restricted = detail.policy !== "Free";
  const drawbackRates = detail.drawback
    ? [...new Set(detail.drawback.items.map((i) => i.ratePct))].sort((a, b) => b - a)
    : [];

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-navy text-white shadow-sm">
      {/* Masthead: the code as the artefact it is. */}
      <div className="border-b border-white/10 px-6 pb-6 pt-7 sm:px-9">
        <div className="font-mono text-[2.75rem] font-bold leading-none tracking-tight tabular-nums sm:text-[3.5rem]">
          <span className="text-white">{detail.code.slice(0, 6)}</span>
          <span className="text-artha-gold">{detail.code.slice(6)}</span>
        </div>
        <p className="mt-3 text-[16px] font-medium leading-snug text-white/90">
          {detail.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12.5px] font-semibold">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                restricted ? "bg-[#FBBF24]" : "bg-[#6EE7B7]"
              }`}
              aria-hidden
            />
            <span className={POLICY_TONE[detail.policy] ?? "text-[#FBBF24]"}>
              {restricted ? detail.policy : "Free to export"}
            </span>
          </span>
          {restricted && (
            <span className="text-[12.5px] text-white/70">
              Confirm with DGFT before shipping — policy moves by notification.
            </span>
          )}
        </div>
        {restricted && detail.condition && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#FCA5A5]/10 p-3 text-[13px] leading-relaxed text-[#FCA5A5]">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{detail.condition}</span>
          </p>
        )}
      </div>

      {/* Figures first — this is what people came for. */}
      <div className="grid gap-px bg-white/10 sm:grid-cols-3">
        <Figure
          name="GST"
          settled={detail.gst.unambiguous}
          values={detail.gst.candidates.map((c) => `${c.rate}%`)}
        />
        <Figure
          name="RoDTEP"
          settled={detail.rodtep !== null}
          values={detail.rodtep ? [`${detail.rodtep.notifiedRatePct}%`] : []}
          unit={detail.rodtep ? "of FOB" : undefined}
        />
        <Figure
          name="Duty Drawback"
          settled={detail.drawback?.unambiguous ?? false}
          values={drawbackRates.map((r) => `${r}%`)}
          unit={detail.drawback ? "of FOB" : undefined}
        />
      </div>

      {/* Every caveat the modules emit, kept verbatim. */}
      <div className="space-y-3 border-t border-white/10 px-6 py-5 text-[12.5px] leading-relaxed text-white/70 sm:px-9">
        <p>
          <span className="text-white">GST</span> — {detail.gst.description}{" "}
          Exports are zero-rated; under an LUT you don&apos;t charge it at all.
        </p>
        <p>
          <span className="text-white">RoDTEP</span> —{" "}
          {detail.rodtep?.description ??
            "No rate is notified for this tariff line. That's a real answer, not missing data — about 15% of export lines carry none."}
        </p>
        <p>
          <span className="text-white">Duty Drawback</span> —{" "}
          {detail.drawback?.description ??
            `No Duty Drawback entry for heading ${detail.code.slice(0, 4)}.`}
        </p>
        {detail.drawback && !detail.drawback.unambiguous && (
          <details className="pt-1">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.12em] text-white/60 transition-colors hover:text-artha-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold">
              {detail.drawback.items.length} drawback items ▾
            </summary>
            <ul className="mt-2 divide-y divide-white/10 border-t border-white/10">
              {detail.drawback.items.map((it) => (
                <li key={it.drawbackItem} className="flex gap-3 py-2">
                  <span className="w-16 shrink-0 font-mono text-[12px] tabular-nums text-white/60">
                    {it.drawbackItem}
                  </span>
                  <span className="w-11 shrink-0 font-mono text-[12px] font-bold tabular-nums text-white">
                    {it.ratePct}%
                  </span>
                  <span className="text-[12px] leading-snug text-white/70">
                    {it.description || "—"}
                    {it.capPerUnitInr !== null && (
                      <span className="text-white/60">
                        {" "}· cap ₹{it.capPerUnitInr}/{it.unit || "unit"}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* The drill-down. */}
      <div className="border-t border-white/10 px-6 py-6 sm:px-9">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/50">
          How this code narrows
        </p>
        <ol className="mt-3">
          {detail.levels.map((lv, i) => (
            <li
              key={lv.at}
              className="hsn-rung flex gap-3 py-2"
              style={{ paddingLeft: `${i * 18}px`, animationDelay: `${i * 70}ms` }}
            >
              <span
                className={`w-8 shrink-0 font-mono text-[15px] font-bold tabular-nums ${
                  lv.indian ? "text-artha-gold" : "text-white"
                }`}
              >
                {lv.digits}
              </span>
              <div className="min-w-0 border-l border-white/15 pl-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
                    {lv.level}
                  </span>
                  <span className="font-mono text-[10.5px] tabular-nums text-white/50">
                    {lv.at}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-white/70">{lv.title}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="border-t border-white/10 bg-white/[0.03] px-6 py-5 sm:px-9">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/50">
          Basic Customs Duty — not shown
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/70">
          GST was consolidated into one notification under GST 2.0. BCD never
          was — it sits across roughly 98 chapter notifications amended most
          Budgets, so there&apos;s no source we could build a reliable lookup
          from. Check it against the{" "}
          <a
            href="https://www.cbic.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-artha-gold underline underline-offset-2 hover:text-white"
          >
            CBIC tariff
          </a>{" "}
          or your broker. It falls on imports, so as an exporter it reaches you
          only through the inputs you buy in.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-5 sm:px-9">
        <p className="text-[13px] text-white/80">
          Need what your buyer pays to land this abroad?
        </p>
        <Link href="/calculator">
          <Button className="cursor-pointer gap-1.5 bg-artha-gold text-navy hover:bg-artha-gold/90">
            Landed cost calculator <ArrowRight size={15} />
          </Button>
        </Link>
      </div>
    </article>
  );
}

/**
 * One figure, rendered by how settled it is.
 * settled → a single number. unsettled → every candidate, as a set, with a
 * marker. none → an em dash. Never one confident number with a caveat hidden
 * underneath it.
 */
function Figure({
  name,
  settled,
  values,
  unit,
}: {
  name: string;
  settled: boolean;
  values: string[];
  unit?: string;
}) {
  const none = values.length === 0;
  const shown = values.slice(0, 3);
  const rest = values.length - shown.length;

  return (
    <div className="bg-navy px-6 py-5 sm:px-5">
      <p className="font-mono text-[10.5px] tracking-[0.14em] text-white/60">{name}</p>
      {none ? (
        <p className="mt-1.5 font-mono text-3xl font-bold text-white/45">—</p>
      ) : settled ? (
        <p className="mt-1.5 font-mono text-3xl font-bold leading-none tabular-nums text-white">
          {values[0]}
          {unit && (
            <span className="ml-1.5 font-sans text-[12px] font-medium text-white/70">
              {unit}
            </span>
          )}
        </p>
      ) : (
        <div className="mt-1.5">
          <p className="flex flex-wrap items-baseline gap-x-1.5 font-mono text-2xl font-bold leading-none tabular-nums text-white">
            {shown.map((v, i) => (
              <span key={v}>
                {i > 0 && <span className="mr-1.5 text-white/45">/</span>}
                {v}
              </span>
            ))}
            {rest > 0 && (
              <span className="text-[13px] font-normal text-white/70">+{rest}</span>
            )}
          </p>
          <span className="mt-2 inline-block rounded-full bg-[#FBBF24]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#FBBF24]">
            Not settled
          </span>
        </div>
      )}
    </div>
  );
}
