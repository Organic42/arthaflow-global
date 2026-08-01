"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, AlertTriangle } from "lucide-react";

/**
 * Public HSN code search.
 *
 * Retrieve-then-choose, like /calculator and like Saathi: search returns a
 * shortlist, the user picks the tariff line, and every figure below is a lookup
 * into JSON bundled with the app. No live API call, ever.
 *
 * THE DESIGN RULE THIS PAGE IS BUILT ON: settled values look singular,
 * unsettled values look plural. Competitors print one confident number for
 * everything. Our data layer deliberately refuses to — chapter 61's GST really
 * is 5% or 18% depending on price, and a drawback rate really cannot be pinned
 * to an ITC-HS line (see gst.ts and drawback.ts). Rendering those as one big
 * number with a grey caveat underneath would contradict the data. So an
 * unsettled figure is never given the single-number treatment; it renders as a
 * visible set, and you can tell the difference across the room.
 *
 * BCD is absent and the page says so rather than omitting it quietly — there is
 * no consolidated source to build it from.
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

interface CodeLevel {
  digits: string;
  at: string;
  level: string;
  title: string;
  indian: boolean;
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
  levels: CodeLevel[];
  policy: string;
  condition: string;
  gst: GstDetail;
  rodtep: RodtepDetail | null;
  drawback: DrawbackDetail | null;
}

/** Real starting points, and a demonstration that a bare code works too. */
const EXAMPLES = ["leather handbags", "basmati rice", "brass door handles", "61091000"];

/**
 * Badge tones, stated per mode instead of reusing the shared semantic tokens.
 * Measured, the tokens don't clear WCAG AA at these sizes: --color-warning on
 * --gold-bg is 3.0:1 in light and 3.5:1 in dark, and --color-success on
 * --green-bg is 3.6:1, against the 4.5:1 small-text floor. These pairs measure
 * 6.7-8.1:1 in both modes. The tinted backgrounds are unchanged.
 */
const TONE = {
  ok: "bg-green-bg text-[#065F46] dark:text-[#6EE7B7]",
  warn: "bg-gold-bg text-[#92400E] dark:text-[#FBBF24]",
  stop: "bg-red-bg text-[#991B1B] dark:text-[#FCA5A5]",
} as const;

/** Stated outright rather than left to UA defaults: the base layer restyles
 *  outline-color globally, and these custom rows are bare buttons. */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-artha-gold";

const POLICY_TONE: Record<string, string> = {
  Free: TONE.ok,
  Restricted: TONE.warn,
  STE: TONE.warn,
  Prohibited: TONE.stop,
};

export default function HsnSearchPage() {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [lineCode, setLineCode] = useState<string | null>(null);

  const [searching, setSearching] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LineDetail | null>(null);

  async function runSearch(raw: string) {
    if (!raw.trim()) return;
    setSearching(true);
    setError(null);
    setDetail(null);
    setPicked(null);
    setLineCode(null);
    try {
      const r = await fetch(`/api/hsn-search?q=${encodeURIComponent(raw)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Search failed.");
      const list: Candidate[] = d.candidates ?? [];
      setCandidates(list);
      // A bare code resolves to exactly one candidate — go straight there
      // rather than showing a shortlist of one.
      if (list.length === 1) selectCandidate(list[0]);
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

  return (
    <section className="min-h-[70vh] bg-background px-6 pb-24 pt-14 sm:px-8">
      <div className="mx-auto max-w-[760px]">
        <header className="mb-9">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            ITC(HS) 2022 · Free · No sign-up
          </p>
          <h1 className="mb-3 text-3xl font-extrabold leading-[1.1] tracking-tight text-text-heading sm:text-[2.6rem]">
            Know what your HSN code actually says
          </h1>
          <p className="max-w-[52ch] text-base leading-relaxed text-text-secondary">
            Search a product or paste a code to get the tariff line, its GST rate
            and what you claim back on export. Where the rules genuinely
            don&apos;t settle on one number, you get all of them — not a guess.
          </p>
        </header>

        {/* ── Find the code ── */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query);
            }}
            className="flex gap-2"
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="leather handbags — or 42022110"
              aria-label="Product description or HSN code"
              className="h-11"
            />
            <Button type="submit" disabled={searching} className="h-11 shrink-0 gap-1.5">
              <Search size={15} />
              {searching ? "Searching…" : "Search"}
            </Button>
          </form>

          {!candidates && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-text-muted">Try</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setQuery(ex);
                    runSearch(ex);
                  }}
                  className={`rounded-full border border-border px-3 py-1 font-mono text-[12px] text-text-body transition-colors hover:border-artha-gold hover:bg-gold-bg ${FOCUS}`}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {candidates && candidates.length === 0 && (
            <p className="mt-4 text-sm text-text-secondary">
              No match. Try the material and what the product is used for — that
              is how the nomenclature is written — or paste a 2–8 digit code.
            </p>
          )}

          {candidates && candidates.length > 1 && (
            <div className="mt-5">
              <SectionLabel>Pick the closest match</SectionLabel>
              <p className="mb-3 text-[13px] text-text-secondary">
                We never choose for you. Every figure below depends on this code.
              </p>
              <div className="divide-y divide-border border-y border-border">
                {candidates.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => selectCandidate(c)}
                    className={`flex w-full items-baseline gap-3 py-3 text-left transition-colors hover:bg-hover-gold ${FOCUS} ${
                      picked?.code === c.code ? "bg-gold-bg" : ""
                    }`}
                  >
                    <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums text-artha-gold">
                      {c.code}
                    </span>
                    <span className="text-[13.5px] leading-snug text-text-body">
                      {c.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {picked && picked.lines.length > 1 && (
            <div className="mt-5">
              <SectionLabel>Choose the tariff line</SectionLabel>
              <p className="mb-3 text-[13px] text-text-secondary">
                The last two digits are India&apos;s. This is what goes on the
                shipping bill.
              </p>
              <div className="divide-y divide-border border-y border-border">
                {picked.lines.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => loadDetail(l.code)}
                    className={`flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-hover-gold ${FOCUS} ${
                      lineCode === l.code ? "bg-gold-bg" : ""
                    }`}
                  >
                    <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums text-text-heading">
                      <span className="text-text-muted">{l.code.slice(0, 6)}</span>
                      {l.code.slice(6)}
                    </span>
                    <span className="flex-1 text-[13.5px] leading-snug text-text-body">
                      {l.description}
                    </span>
                    {l.policy !== "Free" && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          POLICY_TONE[l.policy] ?? TONE.warn
                        }`}
                      >
                        {l.policy}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {picked && picked.lines.length === 0 && (
            <p className="mt-5 text-sm text-text-secondary">
              DGFT&apos;s export schedule lists no 8-digit line under HS{" "}
              <span className="font-mono">{picked.code}</span>. The 6-digit code
              stands; confirm the tariff line with DGFT or a customs broker.
            </p>
          )}
        </div>

        {error && (
          <div className={`mb-6 rounded-xl border border-error/30 p-4 text-sm ${TONE.stop}`}>
            {error}
          </div>
        )}

        {loadingDetail && (
          <p className="py-6 text-center font-mono text-[13px] text-text-muted">
            Resolving…
          </p>
        )}

        {detail && <Docket detail={detail} />}

        <p className="mt-10 border-t border-border pt-6 text-[12px] leading-relaxed text-text-muted">
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

/* ── The docket ─────────────────────────────────────────────────────────── */

function Docket({ detail }: { detail: LineDetail }) {
  const restricted = detail.policy !== "Free";
  const drawbackRates = detail.drawback
    ? [...new Set(detail.drawback.items.map((i) => i.ratePct))].sort((a, b) => b - a)
    : [];

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Masthead: the code as the artefact it is. The first six digits are the
          world's, the last two are India's — shown, not explained away. */}
      <div className="border-b border-border px-6 pt-6 pb-5 sm:px-8">
        <div className="font-mono text-4xl font-bold leading-none tracking-tight tabular-nums sm:text-5xl">
          <span className="text-text-heading">{detail.code.slice(0, 6)}</span>
          <span className="text-artha-gold">{detail.code.slice(6)}</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em]">
          <span className="text-text-muted">
            <span className="text-text-secondary">──────</span> International
          </span>
          <span className="text-text-muted">
            <span className="text-artha-gold">──</span> India
          </span>
        </div>
        <p className="mt-4 text-[15px] font-medium leading-snug text-text-body">
          {detail.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
              POLICY_TONE[detail.policy] ?? TONE.warn
            }`}
          >
            {restricted ? detail.policy : "Free to export"}
          </span>
          {restricted && (
            <span className="text-[12.5px] text-text-secondary">
              Confirm with DGFT before shipping — policy moves by notification.
            </span>
          )}
        </div>
        {restricted && detail.condition && (
          <p className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-[13px] leading-relaxed ${TONE.stop}`}>
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{detail.condition}</span>
          </p>
        )}
      </div>

      {/* Signature: the drill-down. Each pair of digits narrows the meaning. */}
      <div className="border-b border-border px-6 py-6 sm:px-8">
        <SectionLabel>How this code narrows</SectionLabel>
        <ol className="mt-3">
          {detail.levels.map((lv, i) => (
            <li
              key={lv.at}
              className="hsn-rung flex gap-3 py-2"
              style={{
                paddingLeft: `${i * 18}px`,
                animationDelay: `${i * 70}ms`,
              }}
            >
              <span
                className={`w-8 shrink-0 font-mono text-[15px] font-bold tabular-nums ${
                  lv.indian ? "text-artha-gold" : "text-text-heading"
                }`}
              >
                {lv.digits}
              </span>
              <div className="min-w-0 border-l border-border pl-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted">
                    {lv.level}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-text-muted">
                    {lv.at}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-text-body">
                  {lv.title}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* GST is a domestic tax. Separating it from the export claims answers the
          question a manufacturer actually has, instead of listing four rates. */}
      <div className="border-b border-border px-6 py-6 sm:px-8">
        <SectionLabel>If you sell it in India</SectionLabel>
        <div className="mt-3">
          <Figure
            name="GST"
            settled={detail.gst.unambiguous}
            values={detail.gst.candidates.map((c) => `${c.rate}%`)}
            note={detail.gst.description}
          />
        </div>
        <p className="mt-4 text-[12.5px] leading-relaxed text-text-secondary">
          Exporting instead? Exports are zero-rated — under a Letter of
          Undertaking you don&apos;t charge this at all.
        </p>
      </div>

      <div className="px-6 py-6 sm:px-8">
        <SectionLabel>If you export it</SectionLabel>
        <div className="mt-3 divide-y divide-border">
          <div className="pb-4">
            <Figure
              name="RoDTEP"
              settled={detail.rodtep !== null}
              values={
                detail.rodtep ? [`${detail.rodtep.notifiedRatePct}%`] : []
              }
              unit={detail.rodtep ? "of FOB" : undefined}
              note={
                detail.rodtep?.description ??
                "No rate is notified for this tariff line. That is a real answer, not missing data — about 15% of export lines carry no RoDTEP."
              }
            />
          </div>
          <div className="pt-4">
            <Figure
              name="Duty Drawback"
              settled={detail.drawback?.unambiguous ?? false}
              values={drawbackRates.map((r) => `${r}%`)}
              unit={detail.drawback ? "of FOB" : undefined}
              note={
                detail.drawback?.description ??
                `No Duty Drawback entry for heading ${detail.code.slice(0, 4)}.`
              }
            />
            {detail.drawback && !detail.drawback.unambiguous && (
              <details className="mt-3 group">
                <summary className={`cursor-pointer font-mono text-[11.5px] uppercase tracking-[0.12em] text-text-muted transition-colors hover:text-artha-gold ${FOCUS}`}>
                  {detail.drawback.items.length} drawback items ▾
                </summary>
                <ul className="mt-2 divide-y divide-border border-t border-border">
                  {detail.drawback.items.map((it) => (
                    <li key={it.drawbackItem} className="flex gap-3 py-2">
                      <span className="w-16 shrink-0 font-mono text-[12px] tabular-nums text-text-muted">
                        {it.drawbackItem}
                      </span>
                      <span className="w-12 shrink-0 font-mono text-[12px] font-bold tabular-nums text-text-heading">
                        {it.ratePct}%
                      </span>
                      <span className="text-[12.5px] leading-snug text-text-secondary">
                        {it.description || "—"}
                        {it.capPerUnitInr !== null && (
                          <span className="text-text-muted">
                            {" "}
                            · cap ₹{it.capPerUnitInr}/{it.unit || "unit"}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* Said plainly rather than left as a silent gap. */}
      <div className="border-t border-border bg-background px-6 py-5 sm:px-8">
        <SectionLabel>Basic Customs Duty — not shown</SectionLabel>
        <p className="mt-2 text-[12.5px] leading-relaxed text-text-secondary">
          GST was consolidated into one notification under GST 2.0. BCD never
          was — it sits across roughly 98 chapter notifications that get amended
          most Budgets, so there is no source we could build a reliable lookup
          from. Check it against the{" "}
          <a
            href="https://www.cbic.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-artha-gold underline underline-offset-2 hover:text-text-heading"
          >
            CBIC tariff
          </a>{" "}
          or your broker. It falls on imports, so as an exporter it reaches you
          only through the inputs you buy in.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-5 sm:px-8">
        <p className="text-[13px] text-text-secondary">
          Need what your buyer pays to land this abroad?
        </p>
        <Link href="/calculator">
          <Button className="gap-1.5 bg-artha-gold text-navy hover:bg-artha-gold/90">
            Landed cost calculator <ArrowRight size={15} />
          </Button>
        </Link>
      </div>
    </article>
  );
}

/**
 * One figure, rendered by how settled it is.
 *
 * `settled` true  → a single large number: this is the rate, full stop.
 * `settled` false → every candidate, shown as a set. Deliberately NOT one big
 *                   number with a caveat under it, because the source genuinely
 *                   carries more than one answer and the design should say so.
 * no values       → an em dash and the real reason, never a blank.
 */
function Figure({
  name,
  settled,
  values,
  unit,
  note,
}: {
  name: string;
  settled: boolean;
  values: string[];
  unit?: string;
  note: string;
}) {
  const none = values.length === 0;
  // A long set stops reading as "a set" and starts reading as noise. Four keeps
  // the plural signal legible; the rest stay one disclosure away, so nothing is
  // hidden — the exact items are listed under the figure.
  const shown = values.slice(0, 4);
  const rest = values.length - shown.length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {/* Not uppercased: RoDTEP is a proper noun and its casing is meaningful. */}
        <span className="font-mono text-[11px] tracking-[0.14em] text-text-muted">
          {name}
        </span>
        {none ? (
          <span className="font-mono text-2xl font-bold text-text-muted">—</span>
        ) : settled ? (
          <span className="font-mono text-3xl font-bold leading-none tabular-nums text-text-heading">
            {values[0]}
            {unit && (
              <span className="ml-1.5 font-sans text-[13px] font-medium text-text-secondary">
                {unit}
              </span>
            )}
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {shown.map((v, i) => (
              <span key={v} className="flex items-center gap-2">
                {i > 0 && <span className="text-text-muted">/</span>}
                <span className="font-mono text-xl font-bold tabular-nums text-text-heading">
                  {v}
                </span>
              </span>
            ))}
            {rest > 0 && (
              <span className="font-mono text-[13px] text-text-secondary">
                +{rest} more
              </span>
            )}
            <span className={`ml-1 rounded-full px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] ${TONE.warn}`}>
              Not settled
            </span>
          </span>
        )}
      </div>
      <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-text-secondary">
        {note}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
      {children}
    </h2>
  );
}
