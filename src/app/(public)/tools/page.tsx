"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, ArrowRight, Check, AlertTriangle, Ban, ChevronDown, Link2,
} from "lucide-react";

/**
 * The export toolkit — every Tier-1 lookup in one flow.
 *
 * WHY THIS EXISTS: /hsn-search and /calculator are two halves of one answer.
 * A manufacturer asking "can I export this, and what do I actually make?" had
 * to search the same product twice on two pages, because one page owned the
 * India side (policy, GST, RoDTEP, Drawback) and the other owned the
 * destination side (duty, VAT, FTA, landed cost). Both pages hit APIs that
 * already return everything; the split was in the UI, not the data.
 *
 * PROGRESSIVE DISCLOSURE, NOT A WIZARD: one search resolves the tariff line
 * and everything India-side lands immediately, with no further input. The
 * destination and invoice-value steps are optional and additive — a
 * manufacturer who only wants to know "is this even legal to export" gets
 * that answer and stops, without being walked through a form.
 *
 * THE DESIGN, AND WHY: this is an instrument, not a brochure. Two rules hold
 * it together.
 *
 *   1. Every number is monospace; every sentence is DM Sans. A reader can tell
 *      a figure from a caveat without reading either.
 *   2. The tariff code is the only loud thing on the page. It is the one
 *      object in this domain that is genuinely characteristic — eight digits
 *      that narrow from chapter to line, where the first six belong to the
 *      world and the last two belong to India. The ladder lights two more
 *      digits at each rung, so the narrowing happens in front of you rather
 *      than being described. Everything else stays quiet so that can land.
 *
 * The identity strip is sticky under the nav because the thing you lose while
 * scrolling a page of numbers is which product they describe.
 *
 * NO NEW BACKEND: /api/hsn-search resolves the line and the India-side
 * figures; /api/tariff/landed-cost lists destinations and computes the
 * buyer/exporter waterfall. This page composes them.
 *
 * THE RULE INHERITED FROM /hsn-search, UNCHANGED: settled values look
 * singular, unsettled values look plural. gst.ts and drawback.ts refuse to
 * collapse a real ambiguity into one number, so neither does this page.
 */

// ── Types ────────────────────────────────────────────────────────────────────

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

interface Destination { iso3: string; name: string; hasFta: boolean }
interface Vat {
  label: string;
  ratePct: number;
  amountInr: number;
  recoverable: boolean;
  note?: string;
}
interface Fta {
  name: string;
  status: "in-force" | "signed" | "announced";
  claimable: boolean;
  inForceSince?: string;
  note?: string;
}
interface LandedResult {
  buyer: {
    fobInr: number;
    freightInr: number;
    insuranceInr: number;
    cifInr: number;
    dutyBasis: string;
    dutyRatePct: number;
    dutyInr: number;
    landedCostInr: number;
    upliftPct: number;
    vat: Vat | null;
    cashAtBorderInr: number;
  };
  exporter: {
    rodtepInr: number | null;
    rodtepRatePct: number | null;
    drawbackInr: number | null;
    drawbackRatePct: number | null;
    drawbackAmbiguous: boolean;
    netRealisationInr: number;
  };
  destination: { country: string; year: number };
  fta: Fta | null;
  surcharge: {
    name: string;
    kind: "additional-tariff" | "carbon-levy";
    headlineRatePct: number | null;
    since: string;
    coversProduct: boolean;
    source: string;
  } | null;
  caveats: string[];
}

interface MarketRow {
  iso3: string;
  country: string;
  dutyRatePct: number | null;
  year: number | null;
  hasFta: boolean;
  ftaName: string | null;
  ftaClaimable: boolean;
  vatRatePct: number | null;
  vatLabel: string | null;
  vatRecoverable: boolean;
  vatKnown: boolean;
  surchargeName: string | null;
  surchargeRatePct: number | null;
  surchargeCovers: boolean;
  unavailable: string | null;
}
interface MarketRank {
  rows: MarketRow[];
  pricedCount: number;
  totalCount: number;
  ftaCount: number;
  dutyFreeCount: number;
  surchargedCount: number;
}

const EXAMPLES = ["leather handbags", "basmati rice", "brass door handles", "61091000"];

/**
 * The hero's worked example. An empty search box cannot show what this page
 * does, and the thing it does that nothing else does is resolve a product to
 * a tariff line — so the hero demonstrates that on the exact code the
 * placeholder invites you to paste. Transcribed from ITC-HS 2022, same source
 * the live ladder reads.
 */
const DEMO_CODE = "42022110";
const DEMO_LADDER = [
  { lit: 2, level: "chapter", title: "Articles of leather" },
  { lit: 4, level: "heading", title: "Handbags, travel goods, cases" },
  { lit: 6, level: "subheading", title: "Handbags, outer surface of leather" },
  { lit: 8, level: "tariff line", title: "Hand-bags for ladies" },
];

const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/**
 * A heading can carry seventeen drawback items whose rates cluster tightly.
 * Listing the first three and a "+14" reads as noise, and implies the three
 * shown are somehow the likely ones. The range is the true summary — and it is
 * exactly what the calculator's own caveat prose says further down the page.
 */
function drawbackSummary(d: DrawbackDetail): string {
  if (d.unambiguous) return `${d.items[0].ratePct}%`;
  const rates = d.items.map((i) => i.ratePct);
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  return lo === hi ? `${lo}%` : `${lo}–${hi}%`;
}

/** Export policy is the go/no-go, so it is the one place colour means something. */
const POLICY: Record<string, { tone: string; Icon: typeof Check; label: string }> = {
  Free: { tone: "text-[#34D399]", Icon: Check, label: "Free to export" },
  Restricted: { tone: "text-[#FBBF24]", Icon: AlertTriangle, label: "Restricted" },
  STE: { tone: "text-[#FBBF24]", Icon: AlertTriangle, label: "State trading only" },
  Prohibited: { tone: "text-[#FCA5A5]", Icon: Ban, label: "Prohibited" },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ExportToolkitPage() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<LineHit[] | null>(null);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<LineDetail | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destIso, setDestIso] = useState("");
  const [fob, setFob] = useState("");
  const [freight, setFreight] = useState("");
  const [insurance, setInsurance] = useState("");
  const [result, setResult] = useState<LandedResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const [ranking, setRanking] = useState<MarketRank | null>(null);
  const [rankingBusy, setRankingBusy] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);
  const [showAllMarkets, setShowAllMarkets] = useState(false);

  const [copied, setCopied] = useState(false);

  const searchAbort = useRef<AbortController | null>(null);
  /** Guards the URL sync so it cannot fire before the URL has been read. */
  const restored = useRef(false);
  const syncSkippedFirst = useRef(false);
  const detailAbort = useRef<AbortController | null>(null);
  const calcAbort = useRef<AbortController | null>(null);

  // ── Resolve one tariff line ────────────────────────────────────────────────
  const load = useCallback(async (code: string) => {
    setSelected(code);
    // The ranking is per-product; carrying it across a new search would show
    // one product's markets under another's code.
    setRanking(null);
    setRankError(null);
    setShowAllMarkets(false);
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

  // ── Live search, debounced ─────────────────────────────────────────────────
  // Every state write sits inside the timeout so nothing is set during the
  // effect's synchronous phase, and each keystroke aborts the in-flight
  // request so a slow early response cannot overwrite a newer one.
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
        const r = await fetch(`/api/hsn-search?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        const d = await r.json();
        const flat: LineHit[] = [];
        for (const c of d.candidates ?? []) {
          for (const l of c.lines ?? []) {
            flat.push({ code: l.code, description: l.description, policy: l.policy, parent: c.code });
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

  // ── Shareable URLs ─────────────────────────────────────────────────────────
  // A landed cost a manufacturer cannot send to their buyer, their CA or their
  // freight forwarder is a dead end, and those are exactly the people who would
  // pass it on. State lives in the query string so every result has an address.
  //
  // Uses the History API rather than useSearchParams + router.replace on
  // purpose: useSearchParams forces a Suspense boundary on this page, and
  // router.replace would push a re-render through the tree on every keystroke
  // in the invoice field. replaceState changes the address bar and nothing
  // else, which is all this needs.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    // Every state write sits inside the timeout, the same rule the search and
    // landed-cost effects follow — a setState in an effect body cascades
    // renders. It also guarantees this lands after the sync effect below has
    // taken its skipped first pass.
    const t = setTimeout(() => {
      const p = new URLSearchParams(window.location.search);
      const hs = (p.get("hs") ?? "").replace(/\D/g, "");
      // Deliberately not setting `query` too: that would re-run the search for
      // a line we are about to load directly, and fetch the same thing twice.
      if (hs.length === 8) load(hs);
      const to = p.get("to");
      if (to) setDestIso(to.toUpperCase().slice(0, 3));
      const num = (k: string) => {
        const v = (p.get(k) ?? "").replace(/[^\d.]/g, "");
        return v && Number(v) > 0 ? v : "";
      };
      const f = num("fob"); if (f) setFob(f);
      const fr = num("freight"); if (fr) setFreight(fr);
      const ins = num("insurance"); if (ins) setInsurance(ins);
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  // Write state back. The first run is skipped so the restore above is not
  // overwritten by the empty state it started from.
  useEffect(() => {
    if (!syncSkippedFirst.current) {
      syncSkippedFirst.current = true;
      return;
    }
    const p = new URLSearchParams();
    if (selected) p.set("hs", selected);
    if (destIso) p.set("to", destIso);
    if (fob) p.set("fob", fob);
    if (freight) p.set("freight", freight);
    if (insurance) p.set("insurance", insurance);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [selected, destIso, fob, freight, insurance]);

  // ── Destination list (populates the picker) ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/tariff/landed-cost");
        const d = await r.json();
        if (!cancelled) setDestinations(d.destinations ?? []);
      } catch {
        // Non-fatal: the India-side half of the page still works without it.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Landed cost, recomputed when the inputs settle ─────────────────────────
  useEffect(() => {
    const fobNum = Number(fob);
    // Every state write sits inside the timeout, including the clear-out for
    // incomplete input — a setState in the effect body itself cascades renders.
    const t = setTimeout(async () => {
      if (!selected || !destIso || !fobNum || fobNum <= 0) {
        setResult(null);
        setCalcError(null);
        return;
      }
      setCalculating(true);
      setCalcError(null);
      calcAbort.current?.abort();
      const ac = new AbortController();
      calcAbort.current = ac;
      try {
        const r = await fetch("/api/tariff/landed-cost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            // The tariff API prices duty at HS-6 but takes the 8-digit line
            // separately, where it buys a precise RoDTEP rate instead of a
            // heading-level one. Both are the same code, split as it expects.
            hsCode: selected.slice(0, 6),
            itcCode: selected,
            destinationIso: destIso,
            fobInr: fobNum,
            freightInr: Number(freight) || 0,
            insuranceInr: Number(insurance) || 0,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not calculate.");
        setResult(d.data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setCalcError(e instanceof Error ? e.message : "Could not calculate.");
          setResult(null);
        }
      } finally {
        setCalculating(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [selected, destIso, fob, freight, insurance]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!hits?.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); load(hits[active].code); }
  }

  function reset() {
    setCopied(false);
    setSelected(null);
    setDetail(null);
    setResult(null);
    setCalcError(null);
    setRanking(null);
    setRankError(null);
    setShowAllMarkets(false);
  }

  /**
   * Explicit, never automatic. One press can mean 43 upstream tariff lookups,
   * so it waits to be asked rather than firing on every resolved product.
   */
  async function runRanking() {
    if (!selected) return;
    setRankingBusy(true);
    setRankError(null);
    try {
      const r = await fetch("/api/tariff/market-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hsCode: selected.slice(0, 6) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Could not rank markets.");
      setRanking(d.data);
    } catch (e) {
      setRankError(e instanceof Error ? e.message : "Could not rank markets.");
    } finally {
      setRankingBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is permission-gated and blocked outright in some in-app
      // browsers. The address bar already carries the state, so say that
      // rather than failing silently.
      setCopied(false);
      window.prompt("Copy this link:", window.location.href);
    }
  }

  const dest = destinations.find((d) => d.iso3 === destIso);
  const policy = detail ? POLICY[detail.policy] ?? POLICY.Free : null;

  return (
    <div className="bg-background">
      {/* ══ SEARCH ═══════════════════════════════════════════════════════════
          Navy, flush against the navy nav above it, so the dark mass reads as
          one block. It collapses rather than unmounting once a line resolves —
          the input keeps focus and stays available for the next search. */}
      {!detail && (
      <section className="flex min-h-[calc(100vh-4rem)] flex-col justify-center bg-navy px-6 py-16 sm:px-10">
        <div className="mx-auto grid w-full max-w-[1080px] gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div>
          <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.28em] text-artha-gold">
            Export toolkit · Free · No sign-up
          </div>
          <h1 className="mb-4 font-heading text-[2.6rem] font-bold leading-[0.98] tracking-[-0.03em] text-white sm:text-[4rem]">
            What do you make?
          </h1>
          <p className="mb-10 max-w-[540px] text-[15px] leading-relaxed text-white/55">
            One search tells you whether you can ship it, what India pays you back
            for shipping it, and what your buyer pays to land it.
          </p>

          <div className="relative max-w-[640px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="leather handbags — or 42022110"
              aria-label="Search for your product or HS code"
              className="w-full border-b-2 border-white/25 bg-transparent pb-4 pr-10 font-heading text-[20px] text-white caret-artha-gold outline-none transition-colors placeholder:text-white/25 focus:border-artha-gold sm:text-[26px]"
            />
            {searching && (
              <Loader2
                size={20}
                className="absolute right-1 top-1/2 -translate-y-1/2 animate-spin text-artha-gold"
              />
            )}
          </div>

          {!hits && (
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuery(ex)}
                  className="font-mono text-[12px] text-white/40 underline-offset-4 transition-colors hover:text-artha-gold hover:underline focus-visible:text-artha-gold focus-visible:underline focus-visible:outline-none"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {/* Results sit inside the dark block, directly under the field that
              produced them — no card, no jump to a different surface. */}
          {hits && hits.length > 0 && !selected && (
            <div className="mt-8 max-w-[780px]">
              <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/35">
                {hits.length} tariff line{hits.length === 1 ? "" : "s"} — pick yours
              </div>
              <ul className="max-h-[46vh] overflow-y-auto border-t border-white/10">
                {hits.map((h, i) => (
                  <li key={h.code}>
                    <button
                      onClick={() => load(h.code)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-baseline gap-4 border-b border-white/10 py-2.5 pl-3 pr-2 text-left transition-colors focus-visible:outline-none ${
                        i === active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="font-mono text-[13px] font-medium tracking-[0.06em] text-artha-gold">
                        {h.code}
                      </span>
                      <span className="flex-1 truncate text-[13.5px] text-white/75">{h.description}</span>
                      <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-wider text-white/35">
                        {h.policy}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hits && hits.length === 0 && !searching && (
            <p className="mt-6 max-w-[440px] text-[14px] leading-relaxed text-white/50">
              Nothing matched that. Try a plainer product name — &ldquo;leather
              bags&rdquo; rather than a brand or a model number.
            </p>
          )}

          {error && <p className="mt-6 font-mono text-[13px] text-[#FCA5A5]">{error}</p>}
          </div>

          {!hits && (
            <aside className="hidden lg:block">
              <div className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/35">
                Every product has one of these
              </div>
              <div className="flex flex-col gap-4 border-l border-white/15 pl-5">
                {DEMO_LADDER.map((r) => (
                  <div key={r.lit}>
                    <Digits code={DEMO_CODE} lit={r.lit} onDark />
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/30">
                        {r.level}
                      </span>
                      <span className="text-[12px] text-white/50">{r.title}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[12px] leading-relaxed text-white/40">
                Six digits the whole world agrees on,{" "}
                <span className="text-artha-gold">two that are India&apos;s.</span> Getting
                them right is what decides your duty, your refunds, and whether customs
                releases the shipment.
              </p>
            </aside>
          )}
        </div>
      </section>
      )}

      {loadingDetail && (
        <div className="mx-auto flex max-w-[1080px] items-center gap-2.5 px-6 py-16 font-mono text-[12px] uppercase tracking-[0.2em] text-text-muted sm:px-10">
          <Loader2 size={14} className="animate-spin" /> Resolving
        </div>
      )}

      {detail && !loadingDetail && (
        <>
          {/* ══ IDENTITY STRIP ═══════════════════════════════════════════════
              The one sticky element on the page. Scrolling a column of numbers
              is exactly when you lose track of which product they belong to.
              The nav is h-16 and z-50, so this docks flush beneath it.
              Depends on PageTransition staying transform-free — a transform
              there makes it the containing block for this element and the
              strip drifts off the nav. See the note in page-transition.tsx. */}
          <div className="sticky top-16 z-40 border-b border-white/10 bg-navy px-6 py-3 sm:px-10">
            <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-5 gap-y-2">
              <span className="font-mono text-[18px] font-bold tracking-[0.1em] text-white sm:text-[21px]">
                {detail.code.slice(0, 6)}
                <span className="text-artha-gold">{detail.code.slice(6)}</span>
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-white/55">
                {detail.description}
              </span>
              {policy && (
                <span
                  className={`flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${policy.tone}`}
                >
                  <policy.Icon size={13} strokeWidth={2.5} />
                  {policy.label}
                </span>
              )}
              <button
                onClick={copyLink}
                title="Copy a link to this result"
                className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:text-white focus-visible:underline focus-visible:outline-none"
              >
                {copied ? <Check size={12} strokeWidth={3} /> : <Link2 size={12} />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <button
                onClick={reset}
                className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-white/40 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:text-white focus-visible:underline focus-visible:outline-none"
              >
                Change
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-[1080px] px-6 sm:px-10">
            {detail.condition && (
              <p className="border-l-2 border-artha-gold py-4 pl-4 text-[13.5px] leading-relaxed text-text-body">
                {detail.condition}
              </p>
            )}

            {/* ══ THE LADDER ═════════════════════════════════════════════════
                The signature. Each rung lights two more digits of the same
                code, so the narrowing is the visual rather than a diagram of
                it. Reuses .hsn-rung, which already respects reduced motion. */}
            <Section eyebrow="Your tariff line">
              <div className="flex flex-col border-t border-text-muted/25">
                {detail.levels.map((l, i) => (
                  <div
                    key={l.at}
                    className="hsn-rung flex flex-col gap-1.5 border-b border-text-muted/25 py-4 sm:flex-row sm:items-baseline sm:gap-8"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <Digits code={detail.code} lit={(i + 1) * 2} />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-text-muted">
                        {l.level} {l.at}
                      </div>
                      <div className="mt-0.5 text-[13.5px] leading-snug text-text-body">{l.title}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-text-secondary">
                The first six digits are the same in every country you ship to.{" "}
                <span className="font-semibold text-[#8A6310] dark:text-artha-gold">
                  The last two are India&apos;s alone.
                </span>
              </p>
            </Section>

            {/* ══ INDIA SIDE ═════════════════════════════════════════════════ */}
            <Section eyebrow="What India pays back">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Figure
                  label="GST"
                  value={
                    detail.gst.unambiguous
                      ? `${detail.gst.candidates[0]?.rate}%`
                      : detail.gst.candidates.map((c) => `${c.rate}%`).join(" / ")
                  }
                  unsettled={detail.gst.unambiguous ? undefined : "rates apply"}
                />
                <Figure
                  label="RoDTEP"
                  value={detail.rodtep ? `${detail.rodtep.notifiedRatePct}%` : "—"}
                  sub={detail.rodtep ? "of FOB, notified rate" : undefined}
                />
                <Figure
                  label="Duty drawback"
                  value={detail.drawback ? drawbackSummary(detail.drawback) : "—"}
                  unsettled={
                    detail.drawback && !detail.drawback.unambiguous
                      ? `${detail.drawback.items.length} items`
                      : undefined
                  }
                />
              </div>
              <div className="mt-8 flex flex-col gap-5">
                <Note term="GST">{detail.gst.description}</Note>
                {detail.rodtep && <Note term="RoDTEP">{detail.rodtep.description}</Note>}
                {detail.drawback &&
                  (detail.drawback.unambiguous ? (
                    <Note term="Duty drawback">{detail.drawback.description}</Note>
                  ) : (
                    <DrawbackItems d={detail.drawback} />
                  ))}
              </div>
            </Section>

            {/* ══ MARKET RANKING ═════════════════════════════════════════════
                The question that comes before "where are you selling" is
                "where should I sell". Picking a row answers the next section
                for you, so the two read as one decision. */}
            <Section eyebrow="Where should you sell it?" optional>
              {!ranking && (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                  <p className="max-w-[520px] text-[14px] leading-relaxed text-text-body">
                    Price this product against every market we cover, ranked by the duty
                    your buyer pays. Trade agreements are flagged — several of them take
                    the duty to nothing.
                  </p>
                  <button
                    onClick={runRanking}
                    disabled={rankingBusy}
                    className="inline-flex items-center gap-2 border border-text-muted/30 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-text-heading transition-colors hover:border-artha-gold hover:text-[#8A6310] disabled:opacity-50 dark:hover:text-artha-gold"
                  >
                    {rankingBusy ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Pricing every market
                      </>
                    ) : (
                      <>Rank the markets</>
                    )}
                  </button>
                </div>
              )}
              {rankError && <p className="mt-4 font-mono text-[13px] text-error">{rankError}</p>}

              {ranking && (
                <>
                  <p className="mb-6 max-w-[640px] text-[13.5px] leading-relaxed text-text-body">
                    <span className="font-semibold text-text-heading">
                      {ranking.pricedCount} markets priced.
                    </span>{" "}
                    {ranking.dutyFreeCount > 0 && (
                      <>
                        {ranking.dutyFreeCount} charge no duty at all
                        {ranking.ftaCount > 0 ? ", and " : ". "}
                      </>
                    )}
                    {ranking.ftaCount > 0 && (
                      <>
                        {ranking.ftaCount} are covered by a trade agreement you can claim
                        against a Certificate of Origin.{" "}
                      </>
                    )}
                    Pick one to run the full landed cost below.
                  </p>

                  {ranking.surchargedCount > 0 && (
                    <p className="mb-6 max-w-[640px] border-l-2 border-error py-1 pl-4 text-[13.5px] leading-relaxed text-text-body">
                      <span className="font-semibold text-text-heading">
                        {ranking.surchargedCount} of these markets charge more than the rate
                        shown.
                      </span>{" "}
                      They apply a measure on top of the MFN tariff — a reciprocal duty or a
                      carbon levy — that we cannot resolve to your specific line. They are
                      marked{" "}
                      <span className="font-mono font-bold text-error">+</span> and are ranked
                      on MFN like everything else, so treat their position as optimistic. Pick
                      one to see what applies.
                    </p>
                  )}

                  <div className="border-t border-text-muted/25">
                    {(showAllMarkets ? ranking.rows : ranking.rows.slice(0, 10)).map((m, i) => (
                      <MarketRowLine
                        key={m.iso3}
                        rank={i + 1}
                        m={m}
                        selected={destIso === m.iso3}
                        onPick={() => setDestIso(m.iso3)}
                      />
                    ))}
                  </div>

                  {ranking.rows.length > 10 && (
                    <button
                      onClick={() => setShowAllMarkets((v) => !v)}
                      className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-muted underline-offset-4 transition-colors hover:text-text-heading hover:underline"
                    >
                      {showAllMarkets
                        ? "Show only the top 10"
                        : `Show the other ${ranking.rows.length - 10} markets`}
                    </button>
                  )}

                  <p className="mt-6 max-w-[640px] text-[12px] leading-relaxed text-text-muted">
                    Ranked on the MFN duty rate, which is what differs between markets —
                    freight and insurance are the same wherever you ship, so they cannot
                    change this order. VAT is shown but deliberately does not affect the
                    ranking: a VAT-registered buyer reclaims it, so letting it reorder
                    markets would steer you away from good ones over a cost your buyer
                    never bears.
                  </p>
                </>
              )}
            </Section>

            {/* ══ DESTINATION ════════════════════════════════════════════════ */}
            <Section eyebrow="Where are you selling?" optional>
              <div className="grid grid-cols-1 gap-x-12 gap-y-7 sm:grid-cols-2">
                <Field label="Destination">
                  <div className="relative">
                    <select
                      value={destIso}
                      onChange={(e) => setDestIso(e.target.value)}
                      className="w-full appearance-none border-b border-border bg-transparent py-2 pr-7 font-heading text-[17px] text-text-heading outline-none transition-colors focus:border-artha-gold"
                    >
                      <option value="">Pick a market</option>
                      {destinations.map((d) => (
                        <option key={d.iso3} value={d.iso3}>
                          {d.name}
                          {d.hasFta ? "  ·  FTA" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                  </div>
                </Field>
                <Field label="Invoice value" hint="required">
                  <MoneyInput value={fob} onChange={setFob} placeholder="5,00,000" />
                </Field>
                <Field label="Freight" hint="optional">
                  <MoneyInput value={freight} onChange={setFreight} placeholder="0" />
                </Field>
                <Field label="Insurance" hint="optional">
                  <MoneyInput value={insurance} onChange={setInsurance} placeholder="0" />
                </Field>
              </div>

              {/* FTA status needs no invoice value, so gating it behind one
                  would be an artificial wait. */}
              {dest && (
                <p className="mt-9 border-l-2 border-artha-gold py-1 pl-4 text-[13.5px] leading-relaxed text-text-body">
                  {dest.hasFta ? (
                    <>
                      <span className="font-semibold text-text-heading">
                        India has a trade agreement with {dest.name}.
                      </span>{" "}
                      The duty below is the MFN rate. Your buyer likely pays less against a
                      Certificate of Origin — we don&apos;t hold the preferential rate, so
                      confirm it with their broker.
                    </>
                  ) : (
                    <>No India trade agreement is in force with {dest.name}, so the MFN rate applies.</>
                  )}
                </p>
              )}

              {calculating && (
                <p className="mt-7 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">
                  <Loader2 size={13} className="animate-spin" /> Calculating
                </p>
              )}
              {calcError && <p className="mt-7 font-mono text-[13px] text-error">{calcError}</p>}
            </Section>
          </div>

          {/* ══ THE TWO LEDGERS ══════════════════════════════════════════════
              One invoice, two directions: what leaves your buyer's account and
              what lands back in yours. They face each other across a single
              rule because that comparison is the whole reason to run this. */}
          {result && (
            <section className="bg-navy">
              <div className="mx-auto max-w-[1080px] px-6 sm:px-10">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="border-b border-white/10 py-10 md:border-b-0 md:border-r md:pr-10">
                    <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40">
                      Your buyer pays
                    </div>
                    <div className="mt-7">
                      <LedgerLine label="Goods" value={inr(result.buyer.fobInr)} />
                      <LedgerLine label="Freight" value={inr(result.buyer.freightInr)} />
                      <LedgerLine label="Insurance" value={inr(result.buyer.insuranceInr)} />
                      <LedgerLine
                        label={`Duty · ${result.buyer.dutyRatePct}% on ${result.buyer.dutyBasis}`}
                        value={inr(result.buyer.dutyInr)}
                      />
                      <Total label="Landed cost" value={inr(result.buyer.landedCostInr)} />
                      <p className="mt-2.5 font-mono text-[11px] tracking-wide text-white/40">
                        {result.buyer.upliftPct}% over your invoice
                      </p>
                      {result.surcharge?.coversProduct && (
                        <div className="mt-5 border-l-2 border-[#FCA5A5] py-1 pl-4">
                          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#FCA5A5]">
                            This total is too low
                          </div>
                          <p className="mt-1.5 max-w-[420px] text-[12.5px] leading-relaxed text-white/65">
                            {result.surcharge.name} applies on top of the duty above
                            {result.surcharge.headlineRatePct !== null && (
                              <>
                                , with a headline rate of{" "}
                                <span className="font-mono font-semibold text-white">
                                  {result.surcharge.headlineRatePct}%
                                </span>
                              </>
                            )}
                            . We hold no per-line rate for it and will not estimate one — the
                            note below says what to confirm.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="py-10 md:pl-10">
                    <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-artha-gold">
                      You take home
                    </div>
                    <div className="mt-7">
                      <LedgerLine label="Invoice value" value={inr(result.buyer.fobInr)} />
                      <LedgerLine
                        label={`RoDTEP${result.exporter.rodtepRatePct ? ` · ${result.exporter.rodtepRatePct}%` : ""}`}
                        value={
                          result.exporter.rodtepInr !== null ? "+ " + inr(result.exporter.rodtepInr) : "—"
                        }
                      />
                      <LedgerLine
                        label="Duty drawback"
                        value={
                          result.exporter.drawbackAmbiguous
                            ? "not settled"
                            : result.exporter.drawbackInr !== null
                              ? "+ " + inr(result.exporter.drawbackInr)
                              : "—"
                        }
                      />
                      <Total label="Net realisation" value={inr(result.exporter.netRealisationInr)} gold />
                      <p className="mt-2.5 font-mono text-[11px] tracking-wide text-white/40">
                        landing in {result.destination.country}
                      </p>
                    </div>
                  </div>
                </div>

                {result.buyer.vat && (
                  <div className="grid grid-cols-1 gap-x-10 gap-y-5 border-t border-white/10 py-9 md:grid-cols-2">
                    <div>
                      <div className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40">
                        And then {result.buyer.vat.label}
                      </div>
                      <LedgerLine
                        label={`${result.buyer.vat.label} · ${result.buyer.vat.ratePct}% on landed cost`}
                        value={inr(result.buyer.vat.amountInr)}
                      />
                      <LedgerLine
                        label="Cash your buyer fronts at the border"
                        value={inr(result.buyer.cashAtBorderInr)}
                        strong
                      />
                    </div>
                    <p className="self-end text-[12.5px] leading-relaxed text-white/50 md:pl-10">
                      {result.buyer.vat.recoverable
                        ? "A VAT-registered buyer reclaims this. It is working capital for them, not a reason your price is uncompetitive — quote against the landed cost above, not this number."
                        : result.buyer.vat.note ?? "This tax is not recoverable by the buyer, so it is a real cost of buying from you."}
                    </p>
                  </div>
                )}

                {result.caveats?.length > 0 && (
                  <div className="border-t border-white/10 py-9">
                    <div className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40">
                      Before you quote
                    </div>
                    <ul className="grid grid-cols-1 gap-x-12 gap-y-3.5 lg:grid-cols-2">
                      {result.caveats.map((c, i) => (
                        <li key={i} className="flex gap-3 text-[12.5px] leading-relaxed text-white/55">
                          <span className="mt-[9px] h-px w-3 shrink-0 bg-white/25" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="mx-auto max-w-[1080px] px-6 sm:px-10">
            <div className="flex flex-wrap items-center justify-between gap-6 py-12">
              <p className="max-w-[400px] text-[15px] leading-relaxed text-text-body">
                Next: have the export documents written for this line, and the buyers for
                it found.
              </p>
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 bg-navy px-6 py-3.5 font-heading text-[14px] font-semibold text-white transition-colors hover:bg-[#12294A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold"
              >
                Start exporting free
                <ArrowRight size={16} className="transition-transform motion-safe:group-hover:translate-x-1" />
              </Link>
            </div>

            <p className="border-t border-text-muted/25 py-8 text-[12px] leading-relaxed text-text-muted">
              Tariff lines and export policy from DGFT ITC(HS) 2022. GST from Notification
              9/2025-Integrated Tax (Rate). RoDTEP from DGFT Appendix 4R. Duty Drawback from
              CBIC 77/2023-Cus (N.T.). Destination duties from UNCTAD TRAINS via World Bank
              WITS. Bundled and updated periodically, never fetched live — rates change by
              notification, so confirm before you ship or file.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/**
 * The eight digits, with everything past `lit` dimmed almost out. India's last
 * two are gold whenever they are lit, because that is the one fact about this
 * code worth colouring. Decorative: the code is already read out in full by
 * the sticky strip above, so screen readers skip the repetition.
 */
function Digits({ code, lit, onDark }: { code: string; lit: number; onDark?: boolean }) {
  return (
    <span
      aria-hidden
      className={`shrink-0 font-mono font-bold tracking-[0.22em] ${
        onDark ? "text-[17px]" : "text-[19px] sm:text-[22px]"
      }`}
    >
      {code.split("").map((ch, i) => (
        <span
          key={i}
          className={
            i >= lit
              ? onDark
                ? "text-white/15"
                : "text-text-muted/20"
              : i >= 6
                ? onDark
                  ? "text-artha-gold"
                  : "text-[#8A6310] dark:text-artha-gold"
                : onDark
                  ? "text-white"
                  : "text-text-heading"
          }
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

function Section({
  eyebrow,
  optional,
  children,
}: {
  eyebrow: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-text-muted/25 pb-12 pt-10">
      <h2 className="mb-7 flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-text-heading">
        {eyebrow}
        {optional && <span className="tracking-[0.16em] text-text-muted">optional</span>}
      </h2>
      {children}
    </section>
  );
}

function Figure({
  label,
  value,
  sub,
  unsettled,
}: {
  label: string;
  value: string;
  sub?: string;
  unsettled?: string;
}) {
  return (
    <div className="rounded-lg border border-text-muted/25 bg-card px-5 py-6">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-text-muted">{label}</div>
      <div className="mt-3 font-mono text-[2.4rem] font-bold leading-none tracking-tight text-text-heading">
        {value}
      </div>
      {sub && <div className="mt-3 text-[12px] text-text-secondary">{sub}</div>}
      {unsettled && (
        <div className="mt-3 inline-block rounded bg-gold-bg px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A6310] dark:text-artha-gold">
          {unsettled} · not settled
        </div>
      )}
    </div>
  );
}

/**
 * Seventeen drawback items under one heading, as a rail rather than a
 * sentence. The rates are what a reader is scanning for; the reason we refuse
 * to pick one is the paragraph above them. The schedule's verbatim note sits
 * in the disclosure so nothing published is lost to the rewrite.
 */
function DrawbackItems({ d }: { d: DrawbackDetail }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-heading">
        Duty drawback · {d.items.length} items under heading {d.heading}
      </div>
      <p className="mt-2 max-w-[640px] text-[13px] leading-relaxed text-text-secondary">
        The Drawback Schedule numbers its items below the 4-digit heading, and those numbers
        do not line up with 8-digit ITC-HS codes. Which one applies to your goods is a
        question for your customs broker — we will not pick for you.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
        {d.items.map((it) => (
          <div
            key={it.drawbackItem}
            className="flex items-baseline gap-3 border-b border-text-muted/20 py-2"
          >
            <span className="font-mono text-[11.5px] text-text-muted">{it.drawbackItem}</span>
            <span className="flex-1 truncate text-[12px] text-text-secondary" title={it.description}>
              {it.description || "unlabelled"}
            </span>
            <span className="font-mono text-[13px] font-medium text-text-heading">
              {it.ratePct}%
            </span>
          </div>
        ))}
      </div>
      <details className="group mt-5">
        <summary className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-muted underline-offset-4 hover:text-text-heading hover:underline focus-visible:text-text-heading focus-visible:underline">
          Read the schedule&apos;s own note
        </summary>
        <p className="mt-3 max-w-[720px] text-[12.5px] leading-relaxed text-text-secondary">
          {d.description}
        </p>
      </details>
    </div>
  );
}

/** One market in the ranking. Picking it fills the destination step below. */
function MarketRowLine({
  rank,
  m,
  selected,
  onPick,
}: {
  rank: number;
  m: MarketRow;
  selected: boolean;
  onPick: () => void;
}) {
  const priced = m.dutyRatePct !== null;
  const surcharged = Boolean(m.surchargeName && m.surchargeCovers);
  return (
    <button
      onClick={onPick}
      disabled={!priced}
      className={`flex w-full items-baseline gap-4 border-b border-text-muted/25 px-2 py-3 text-left transition-colors focus-visible:outline-none ${
        selected ? "bg-gold-bg" : priced ? "hover:bg-subtle" : "cursor-default opacity-55"
      }`}
    >
      <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums text-text-muted">
        {priced ? rank : "—"}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] text-text-heading">{m.country}</span>

      {m.ftaClaimable && m.ftaName && (
        <span
          title={m.ftaName}
          className="hidden max-w-[190px] shrink-0 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A6310] dark:text-artha-gold sm:inline"
        >
          {m.ftaName}
        </span>
      )}

      <span className="hidden w-28 shrink-0 text-right font-mono text-[11px] text-text-muted sm:inline">
        {m.vatRatePct !== null
          ? `${m.vatLabel} ${m.vatRatePct}%`
          : m.vatKnown
            ? "no VAT"
            : "VAT unknown"}
      </span>

      <span className="w-24 shrink-0 text-right">
        {priced ? (
          <span className="inline-flex items-baseline gap-1.5">
            <span
              className={`font-mono text-[17px] font-bold tabular-nums ${
                surcharged
                  ? "text-error"
                  : m.dutyRatePct === 0
                    ? "text-[#0E7A5F] dark:text-[#34D399]"
                    : "text-text-heading"
              }`}
            >
              {m.dutyRatePct}%
            </span>
            {/* This rank is built on MFN, and MFN is not the whole story here.
                Saying so on the row is the only way the number is honest. */}
            {surcharged && (
              <span
                title={`${m.surchargeName} applies on top of this rate`}
                className="font-mono text-[13px] font-bold text-error"
              >
                +
              </span>
            )}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-text-muted">no data</span>
        )}
      </span>
    </button>
  );
}

function Note({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <p className="text-[13px] leading-relaxed text-text-secondary">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-heading">
        {term}
      </span>
      <span className="mx-2 text-text-muted">—</span>
      {children}
    </p>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-text-muted">
        {label}
        {hint && <span className="tracking-[0.14em] text-text-muted/60">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-baseline border-b border-border transition-colors focus-within:border-artha-gold">
      <span className="pr-2 font-mono text-[15px] text-text-muted">₹</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent py-2 font-mono text-[17px] text-text-heading outline-none placeholder:text-text-muted/40"
      />
    </div>
  );
}

function LedgerLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[7px]">
      <span className={`text-[13px] ${strong ? "font-semibold text-white" : "text-white/60"}`}>
        {label}
      </span>
      <span
        className={`font-mono text-[13.5px] tabular-nums ${strong ? "font-medium text-white" : "text-white/85"}`}
      >
        {value}
      </span>
    </div>
  );
}

function Total({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-white/25 pt-4">
      <span className="font-heading text-[14px] font-semibold text-white">{label}</span>
      <span
        className={`font-mono text-[1.55rem] font-bold leading-none tabular-nums ${gold ? "text-artha-gold" : "text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}
