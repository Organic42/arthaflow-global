import file from "./india-exports.json";

/**
 * What India actually exported, per tariff line, per financial year.
 *
 * WHAT THIS ANSWERS, AND WHAT IT DOES NOT
 * "How much of this does India sell, and is that growing." It carries no
 * destination dimension whatsoever — the source export is broken down by
 * Indian state, which sums to a clean national series but says nothing about
 * who buys. "Who buys it" is dgcis.ts, a different file from a different
 * export, and the two must never be presented as the same fact.
 *
 * WHY IT MATTERS ON A TARIFF-LINE PAGE
 * Every other figure on /export/[slug] is a rate — what you may claim, what
 * the buyer owes. This is the only one that says whether anyone is actually
 * doing this trade. A line with $400m of Indian exports behind it and one with
 * none are very different propositions, and nothing else on the page separates
 * them.
 *
 * PREFIX AGGREGATION, FOR THE SAME REASON AS dgcis.ts
 * Classification resolves to 6 digits; this data is published at 8. A 6-digit
 * query sums every 8-digit line beneath it and reports how many it summed, so
 * a caller can say so rather than implying the figure belongs to one line.
 */

interface RawFile {
  source: string;
  sourceUrl: string;
  note: string;
  unit: string;
  financialYears: string[];
  partialYearsExcluded: string[];
  hsCodeCount: number;
  /** 8-digit code -> one USD-million total per entry in financialYears. */
  entries: Record<string, number[]>;
}

const FILE = file as RawFile;

export const INDIA_EXPORTS_SOURCE = {
  name: FILE.source,
  url: FILE.sourceUrl,
  note: FILE.note,
  unit: FILE.unit,
  financialYears: FILE.financialYears,
} as const;

export interface IndiaExportSeries {
  /** The prefix actually queried, after digits-only cleaning. */
  prefix: string;
  financialYears: string[];
  /** One total per financial year, US$ million, same order as financialYears. */
  valuesUsdMn: number[];
  /** Most recent complete year's total. */
  latestUsdMn: number;
  latestYear: string;
  /** Year-on-year change against the prior complete year, or null if only one. */
  growthPct: number | null;
  /**
   * How many 8-digit lines were summed. 1 means the figure is that line's own;
   * more means it is a rollup and must be described as one.
   */
  linesAggregated: number;
}

/**
 * Exports for a tariff line or any prefix above it.
 *
 * Accepts 2, 4, 6 or 8 digits. Anything else is rejected rather than guessed
 * at — an odd-length prefix is a caller bug, not a query.
 */
export function indiaExportsFor(code: string): IndiaExportSeries | null {
  const prefix = String(code ?? "").replace(/\D/g, "");
  if (![2, 4, 6, 8].includes(prefix.length)) return null;

  const years = FILE.financialYears;
  const totals = new Array<number>(years.length).fill(0);
  let lines = 0;

  if (prefix.length === 8) {
    const row = FILE.entries[prefix];
    if (!row) return null;
    for (let i = 0; i < years.length; i++) totals[i] = row[i] ?? 0;
    lines = 1;
  } else {
    for (const [key, row] of Object.entries(FILE.entries)) {
      if (!key.startsWith(prefix)) continue;
      lines++;
      for (let i = 0; i < years.length; i++) totals[i] += row[i] ?? 0;
    }
    if (lines === 0) return null;
  }

  const latestUsdMn = Math.round(totals[totals.length - 1] * 1000) / 1000;
  const prev = totals.length > 1 ? totals[totals.length - 2] : null;
  // A jump from zero is an infinite percentage, which is not a number anyone
  // can act on — report no growth rather than a fake one.
  const growthPct =
    prev !== null && prev > 0
      ? Math.round(((latestUsdMn - prev) / prev) * 1000) / 10
      : null;

  return {
    prefix,
    financialYears: years,
    valuesUsdMn: totals.map((v) => Math.round(v * 1000) / 1000),
    latestUsdMn,
    latestYear: years[years.length - 1],
    growthPct,
    linesAggregated: lines,
  };
}

/** US$ million rendered the way a reader expects to see trade values. */
export function formatUsdMn(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(2)} bn`;
  if (v >= 1) return `$${v.toFixed(1)} mn`;
  if (v > 0) return `$${(v * 1000).toFixed(0)}k`;
  return "$0";
}

/**
 * The sentence to attach to the number.
 *
 * States the financial year every time, and discloses aggregation whenever the
 * figure is a rollup — the same disclosure rule dgcis.ts follows, for the same
 * reason: a total silently covering forty lines reads as one line's exports.
 */
export function describeIndiaExports(s: IndiaExportSeries): string {
  const scope =
    s.linesAggregated > 1
      ? `${s.linesAggregated} tariff lines under HS ${s.prefix}, combined,`
      : `ITC-HS ${s.prefix}`;

  const trend =
    s.growthPct === null
      ? ""
      : s.growthPct >= 0
        ? ` That is up ${s.growthPct}% on the previous year.`
        : ` That is down ${Math.abs(s.growthPct)}% on the previous year.`;

  return (
    `India exported ${formatUsdMn(s.latestUsdMn)} under ${scope} in FY ${s.latestYear}.` +
    trend +
    ` National total across every state; it does not say which countries bought it.`
  );
}

/** Lines we hold a figure for — used by diagnostics and tests. */
export function indiaExportsDatasetSize(): number {
  return FILE.hsCodeCount;
}
