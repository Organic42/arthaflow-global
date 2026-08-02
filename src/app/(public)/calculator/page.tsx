"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, AlertTriangle, CornerDownLeft, Loader2 } from "lucide-react";

/**
 * Public landed-cost calculator — a two-pane instrument, sibling to /hsn-search.
 *
 * LIVE, NOT STEPPED: the old version was submit-per-step — search, pick,
 * fill a form, click Calculate, scroll to a separate results card. This
 * recalculates as you type/adjust (debounced, aborts stale requests), the
 * same interaction model as the HSN page's live search. The result panel
 * never blanks between edits — it stays visible and only updates on success,
 * so adjusting one field doesn't flash the screen empty.
 *
 * CURRENCY: invoice/freight/insurance can be entered in USD or INR. There is
 * no live FX source anywhere in this codebase, so USD entry uses a static,
 * clearly-labelled approximate rate (APPROX_USD_INR) — never presented as a
 * live conversion, and restated next to the result whenever it was used.
 *
 * FTA: src/lib/tariff/fta.ts (UAE CEPA, Japan, Korea, ASEAN, UK, Chile) is now
 * wired into landedCost() itself, not just this page — Saathi's
 * calculateLandedCost tool gets the same structured fta field. Never a
 * preferential rate (none is verifiable from any source we can reach — see
 * fta.ts), only whether an agreement exists, whether it's claimable today,
 * and what claiming it requires.
 */

interface TariffLine {
  code: string;
  description: string;
  policy: string;
}
interface Candidate {
  code: string;
  description: string;
  lines: TariffLine[];
}
/** One flattened, directly-selectable result — heading + line collapsed into one list. */
interface Hit {
  code: string; // 8-digit ITC-HS line
  description: string;
  policy: string;
  parent: string; // 6-digit HS heading
  parentDescription: string;
}
interface Destination {
  iso3: string;
  name: string;
  hasFta: boolean;
}

interface Vat {
  label: string;
  ratePct: number;
  baseInr: number;
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
interface Result {
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
  caveats: string[];
}

// No live FX source in this codebase (confirmed — grepped for one before
// building this). A static, visibly-labelled approximation is the honest
// option; a silently "live-looking" rate would not be.
const APPROX_USD_INR = 83.5;

const EXAMPLES = ["leather handbags", "basmati rice", "brass door handles"];

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function CalculatorPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<Hit | null>(null);
  const [searching, setSearching] = useState(false);

  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [dest, setDest] = useState("ARE");
  const [fob, setFob] = useState("");
  const [freight, setFreight] = useState("");
  const [insurance, setInsurance] = useState("");
  const [qty, setQty] = useState("");

  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const searchAbort = useRef<AbortController | null>(null);
  const calcAbort = useRef<AbortController | null>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const fobRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tariff/landed-cost")
      .then((r) => r.json())
      .then((d) => setDestinations(d.destinations ?? []))
      .catch(() => setDestinations([]));
  }, []);

  // ── Live search, debounced — flattens heading+line into one pickable list,
  // same as /hsn-search, so there's no separate "now pick a heading" step. ──
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
        const r = await fetch(`/api/tariff/landed-cost?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const d = await r.json();
        const flat: Hit[] = [];
        for (const c of (d.candidates ?? []) as Candidate[]) {
          for (const l of c.lines) {
            flat.push({
              code: l.code,
              description: l.description,
              policy: l.policy,
              parent: c.code,
              parentDescription: c.description,
            });
          }
          if (flat.length >= 40) break;
        }
        setHits(flat);
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Search failed. Try again.");
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function pick(h: Hit) {
    setSelected(h);
    setResult(null);
    setError(null);
    setTimeout(() => fobRef.current?.focus(), 0);
  }

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
      pick(hits[active]);
    }
  }

  // Converts a field's raw string, in whichever currency is selected, to INR.
  // Every downstream calculation still speaks INR only — this is a client-side
  // convenience, not a new capability of the calculation itself.
  const toInr = useCallback(
    (raw: string): number | undefined => {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return undefined;
      return currency === "USD" ? n * APPROX_USD_INR : n;
    },
    [currency]
  );

  // ── Live calculation, debounced. Every setState lives inside the timeout —
  // see the identical fix on /hsn-search's search effect for why. ──
  useEffect(() => {
    const hsCode = selected?.parent;
    const itcCode = selected?.code;
    const fobInr = toInr(fob);
    const freightInr = toInr(freight);
    const insuranceInr = toInr(insurance);
    const quantity = qty ? Number(qty) : undefined;

    const t = setTimeout(async () => {
      if (!hsCode || fobInr === undefined || !dest) {
        setError(null);
        return;
      }
      setCalculating(true);
      setError(null);
      calcAbort.current?.abort();
      const ac = new AbortController();
      calcAbort.current = ac;
      try {
        const r = await fetch("/api/tariff/landed-cost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            hsCode,
            itcCode,
            destinationIso: dest,
            fobInr,
            freightInr,
            insuranceInr,
            quantity,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Calculation failed.");
        setResult(d.data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError(e instanceof Error ? e.message : "Calculation failed.");
        }
      } finally {
        setCalculating(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [selected, dest, fob, freight, insurance, qty, toInr]);

  const restricted = selected && selected.policy !== "Free";
  const usedUsd = currency === "USD" && (fob || freight || insurance);

  return (
    <section className="min-h-[70vh] bg-background px-5 pb-20 pt-10 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
              Free · No sign-up · Not a quote
            </p>
            <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight text-text-heading sm:text-[2.25rem]">
              What your buyer pays, what you take home
            </h1>
          </div>
          <p className="max-w-[38ch] text-[13.5px] leading-relaxed text-text-secondary">
            Landed cost abroad, and your net after RoDTEP and Duty Drawback.
            Adjust anything and the numbers update — nothing to submit.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
          {/* ── Inputs rail ── */}
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
                aria-label="Product description or HSN code"
                role="combobox"
                aria-expanded={!!hits?.length}
                aria-controls="calc-results"
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

            {!hits && !selected && (
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
                No match. Try the material and what the product is used for —
                that is how the nomenclature is written.
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
                  id="calc-results"
                  ref={railRef}
                  role="listbox"
                  aria-label="Matching tariff lines"
                  className="mt-1.5 max-h-[38vh] overflow-y-auto"
                >
                  {hits.map((h, i) => {
                    const isSel = selected?.code === h.code;
                    return (
                      <li key={h.code} role="option" aria-selected={isSel}>
                        <button
                          type="button"
                          onClick={() => pick(h)}
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
                              {/* text-secondary, not -muted: this sits on the
                                  row's bg-subtle hover state, where -muted
                                  measured 4.34:1 — just under the 4.5:1 floor. */}
                              <span className="text-text-secondary">{h.code.slice(0, 6)}</span>
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

            {/* ── The shipment — appears once a line is picked, no separate step ── */}
            {selected && (
              <div className="mt-4 space-y-3.5 border-t border-border pt-4">
                {restricted && (
                  <p className="flex items-start gap-1.5 rounded-lg bg-red-bg p-2.5 text-[12.5px] leading-snug text-[#991B1B] dark:text-[#FCA5A5]">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      This line is <strong>{selected.policy}</strong> for
                      export — confirm with DGFT before shipping.
                    </span>
                  </p>
                )}

                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-text-heading">
                    Destination
                  </label>
                  <select
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                    className="h-10 w-full cursor-pointer rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-artha-gold focus-visible:ring-2 focus-visible:ring-artha-gold/35"
                  >
                    {destinations.map((d) => (
                      <option key={d.iso3} value={d.iso3}>
                        {d.name}
                        {d.hasFta ? " · FTA" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* One currency for the whole shipment, so a mixed USD-invoice
                    /INR-freight entry (which nobody actually has) can't happen. */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[12.5px] font-medium text-text-heading">
                      Currency
                    </span>
                    <div className="flex overflow-hidden rounded-full border border-border text-[11.5px] font-semibold">
                      {(["INR", "USD"] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCurrency(c)}
                          className={`cursor-pointer px-2.5 py-1 transition-colors ${
                            currency === c
                              ? "bg-artha-gold text-navy"
                              : "text-text-secondary hover:bg-subtle"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  {currency === "USD" && (
                    <p className="font-mono text-[11px] text-text-muted">
                      ≈ ₹{APPROX_USD_INR}/$1 — a static approximation, not a
                      live rate.
                    </p>
                  )}
                </div>

                <MoneyField
                  label={`Invoice value (${currency})`}
                  required
                  inputRef={fobRef}
                  value={fob}
                  onChange={setFob}
                  placeholder={currency === "USD" ? "6000" : "500000"}
                />
                <MoneyField
                  label={`Freight (${currency})`}
                  value={freight}
                  onChange={setFreight}
                  placeholder={currency === "USD" ? "540" : "45000"}
                />
                <MoneyField
                  label={`Marine insurance (${currency})`}
                  value={insurance}
                  onChange={setInsurance}
                  placeholder={currency === "USD" ? "60" : "5000"}
                />
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-text-heading">
                    Quantity (units)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="500"
                    className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-artha-gold focus-visible:ring-2 focus-visible:ring-artha-gold/35"
                  />
                  <p className="mt-1 text-[11.5px] text-text-muted">
                    Needed to apply RoDTEP&apos;s per-unit cap.
                  </p>
                </div>
              </div>
            )}
          </aside>

          {/* ── Result panel ── */}
          <div className="min-h-[420px]">
            {error && (
              <div className="mb-4 rounded-xl bg-red-bg p-4 text-sm text-[#991B1B] dark:text-[#FCA5A5]">
                {error}
              </div>
            )}
            {result ? (
              <Docket
                result={result}
                calculating={calculating}
                usedUsd={!!usedUsd}
              />
            ) : (
              <Placeholder
                stage={!selected ? "no-product" : "no-value"}
                calculating={calculating}
              />
            )}
          </div>
        </div>

        <p className="mt-8 text-[12px] leading-relaxed text-text-muted">
          Duties from UNCTAD TRAINS via World Bank WITS. Tariff lines and
          export policy from DGFT ITC(HS) 2022. RoDTEP from DGFT Appendix 4R,
          Duty Drawback from CBIC 77/2023-Cus (N.T.). Trade agreements from
          DGFT/commerce.gov.in notifications — no preferential rate is held or
          estimated. Confirm with a customs broker before shipping.
        </p>
      </div>
    </section>
  );
}

/* ── Small pieces ────────────────────────────────────────────────────────── */

function MoneyField({
  label,
  value,
  onChange,
  placeholder,
  required,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-text-heading">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-artha-gold focus-visible:ring-2 focus-visible:ring-artha-gold/35"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/65">
      {children}
    </p>
  );
}

/** Empty-state teaching panel — the waterfall, before any real numbers exist. */
function Placeholder({
  stage,
  calculating,
}: {
  stage: "no-product" | "no-value";
  calculating: boolean;
}) {
  const waterfall: Array<[string, string]> = [
    ["FOB", "your invoice value"],
    ["+ Freight + Insurance", "= CIF"],
    ["+ Duty (destination's MFN rate)", "= Landed cost"],
    ["+ Import VAT/GST, where levied", "= Cash at the border"],
  ];
  const back: Array<[string, string]> = [
    ["FOB", "+ RoDTEP + Duty Drawback"],
    ["= Net realisation", "what you actually take home"],
  ];

  return (
    <div className="flex min-h-[420px] flex-col justify-center rounded-2xl border border-border bg-navy px-6 py-10 sm:px-9">
      {calculating ? (
        <p className="text-center font-mono text-[13px] text-white/60">
          Calculating…
        </p>
      ) : stage === "no-product" ? (
        <>
          <SectionLabel>How a landed cost builds up</SectionLabel>
          <p className="mt-2 max-w-[42ch] text-[15px] leading-relaxed text-white/75">
            Two waterfalls, from the same shipment: what it costs your buyer
            to land it, and what comes back to you. Search on the left to
            resolve your product.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
                What your buyer pays
              </p>
              <ol className="space-y-1.5">
                {waterfall.map(([a, b]) => (
                  <li key={a} className="text-[12.5px] leading-snug">
                    <span className="font-mono text-white">{a}</span>{" "}
                    <span className="text-white/65">{b}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
                What you take home
              </p>
              <ol className="space-y-1.5">
                {back.map(([a, b]) => (
                  <li key={a} className="text-[12.5px] leading-snug">
                    <span className="font-mono text-white">{a}</span>{" "}
                    <span className="text-white/65">{b}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </>
      ) : (
        <>
          <SectionLabel>One more thing</SectionLabel>
          <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-white/75">
            Enter an invoice value on the left — that&apos;s the only required
            field. Freight, insurance and quantity sharpen the number but
            aren&apos;t required to see one.
          </p>
        </>
      )}
    </div>
  );
}

/** The docket. Stays mounted and only updates on a successful recalculation —
 *  a dim/opacity cue during recalculation, never a blank flash between edits. */
function Docket({
  result,
  calculating,
  usedUsd,
}: {
  result: Result;
  calculating: boolean;
  usedUsd: boolean;
}) {
  const b = result.buyer;
  const e = result.exporter;
  const fta = result.fta;

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-border bg-navy text-white shadow-sm transition-opacity duration-200 ${
        calculating ? "opacity-70" : "opacity-100"
      }`}
    >
      {/* Masthead */}
      <div className="border-b border-white/10 px-6 pb-6 pt-7 sm:px-9">
        <SectionLabel>Landed cost in {result.destination.country}</SectionLabel>
        <div className="mt-1.5 font-mono text-[2.5rem] font-bold leading-none tabular-nums sm:text-[3.25rem]">
          {money(b.landedCostInr)}
        </div>
        <p className="mt-2 text-[13.5px] text-white/70">
          {b.upliftPct}% above your invoice of {money(b.fobInr)}
          {usedUsd && (
            <span className="text-white/65">
              {" "}
              — converted at the assumed rate on the left, not a live one.
            </span>
          )}
        </p>

        {/* FTA callout — named agreement or an explicit "none", never the old
            vague "may be lower or zero" with no specifics to act on. */}
        {fta?.claimable ? (
          <div className="mt-4 rounded-xl bg-gold-bg/10 border border-artha-gold/30 p-3">
            <p className="text-[13px] font-semibold text-artha-gold">
              {fta.name} is in force
              {fta.inForceSince ? ` since ${fta.inForceSince}` : ""}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-white/70">
              The duty above is the MFN rate — your buyer likely pays less
              with a Certificate of Origin. Confirm the exact preferential
              rate with a customs broker.
            </p>
          </div>
        ) : fta ? (
          <p className="mt-3 text-[12px] text-white/65">
            {fta.name} has been {fta.status} but is not yet in force — the
            MFN rate above still applies.
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-white/65">
            No trade agreement covers {result.destination.country} for Indian
            goods.
          </p>
        )}
      </div>

      {/* Buyer / Exporter breakdown */}
      <div className="grid gap-px bg-white/10 sm:grid-cols-2">
        <div className="space-y-1.5 bg-navy px-6 py-5 sm:px-9">
          <SectionLabel>What your buyer pays</SectionLabel>
          <Row label="Goods" value={money(b.fobInr)} />
          <Row label="Freight" value={money(b.freightInr)} />
          <Row label="Insurance" value={money(b.insuranceInr)} />
          <Row
            label={`Duty (${b.dutyRatePct}% on ${b.dutyBasis})`}
            value={money(b.dutyInr)}
          />
          <div className="mt-1.5 flex justify-between border-t border-white/10 pt-2 font-mono font-bold tabular-nums">
            <span>Landed cost</span>
            <span>{money(b.landedCostInr)}</span>
          </div>

          {b.vat && (
            <div className="mt-3 rounded-lg bg-white/5 p-2.5">
              <div className="flex justify-between text-[12.5px]">
                <span>
                  {b.vat.label} ({b.vat.ratePct}%)
                </span>
                <span className="font-mono tabular-nums">{money(b.vat.amountInr)}</span>
              </div>
              <div className="mt-1 flex justify-between text-[12.5px] font-semibold">
                <span>Cash at the border</span>
                <span className="font-mono tabular-nums">{money(b.cashAtBorderInr)}</span>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/60">
                {b.vat.recoverable
                  ? `A ${b.vat.label}-registered buyer reclaims this — working capital, not a reason your price is uncompetitive.`
                  : "A sales tax the buyer cannot reclaim."}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1.5 bg-navy px-6 py-5 sm:px-9">
          <SectionLabel>What you take home</SectionLabel>
          <Row label="Invoice value" value={money(b.fobInr)} />
          <Row
            label={e.rodtepRatePct !== null ? `RoDTEP (${e.rodtepRatePct}%)` : "RoDTEP"}
            value={e.rodtepInr !== null ? `+ ${money(e.rodtepInr)}` : "—"}
          />
          <Row
            label={
              e.drawbackRatePct !== null
                ? `Duty Drawback (${e.drawbackRatePct}%)`
                : "Duty Drawback"
            }
            value={
              e.drawbackInr !== null
                ? `+ ${money(e.drawbackInr)}`
                : e.drawbackAmbiguous
                  ? "see note"
                  : "—"
            }
          />
          <div className="mt-1.5 flex justify-between border-t border-white/10 pt-2 font-mono font-bold tabular-nums">
            <span>Net realisation</span>
            <span>{money(e.netRealisationInr)}</span>
          </div>
        </div>
      </div>

      {/* Caveats — travel with the number, never behind a click. */}
      <div className="border-t border-white/10 px-6 py-5 sm:px-9">
        <SectionLabel>This is an estimate, not a quote</SectionLabel>
        <ul className="mt-2.5 list-disc space-y-1.5 pl-4 text-[12px] leading-relaxed text-white/65">
          {result.caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-5 sm:px-9">
        <p className="text-[13px] text-white/80">
          Want the export documents, market analysis and shipment help too?
        </p>
        <Link href="/login">
          <Button className="cursor-pointer gap-1.5 bg-artha-gold text-navy hover:bg-artha-gold/90">
            Start free <ArrowRight size={15} />
          </Button>
        </Link>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-[13px]">
      <span className="text-white/70">{label}</span>
      <span className="shrink-0 font-mono tabular-nums text-white/90">{value}</span>
    </div>
  );
}
