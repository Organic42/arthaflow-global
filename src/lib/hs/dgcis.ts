/**
 * India's own export data — DGCIS (Department of Commerce), by 8-digit HS
 * code and destination country.
 *
 * WHY THIS EXISTS: India has zero holdings in UN Comtrade, so getIndiaExports
 * falls back to World Bank WITS — which only reports HS *chapter groups* (16
 * buckets), not real codes, a year further behind. DGCIS is India's own
 * customs-derived data at the real 8-digit ITC-HS granularity our own
 * classification already resolves to.
 *
 * WHY THIS IS NOT LIVE: the source portal's data-extraction endpoint is
 * CAPTCHA-gated (deliberately, against scraping), so this is vendored from a
 * manually-exported CSV rather than fetched at request time — same pattern
 * as rodtep.ts and drawback.ts. Never present this data as real-time; always
 * disclose DGCIS_SOURCE.financialYear.
 *
 * Regenerate with `python scripts/build-dgcis.py` after dropping a fresh
 * export from https://trade-analytics.commerce.gov.in/public/de into
 * .dgcis-source/ — see that script's docstring for the exact steps.
 */

import raw from "./dgcis.json";

interface RawDestination {
  iso3: string;
  valueUsd: number;
}

interface RawEntry {
  description: string;
  totalUsd: number;
  destinations: RawDestination[];
}

interface RawFile {
  source: string;
  sourceUrl: string;
  financialYear: string;
  note: string;
  hsCodeCount: number;
  entries: Record<string, RawEntry>;
}

const FILE = raw as RawFile;

export const DGCIS_SOURCE = {
  source: FILE.source,
  sourceUrl: FILE.sourceUrl,
  financialYear: FILE.financialYear,
  note: FILE.note,
} as const;

/** True once a real CSV has been ingested — false for the inert placeholder. */
export function dgcisHasData(): boolean {
  return FILE.hsCodeCount > 0;
}

export interface DgcisDestination {
  iso3: string;
  valueUsd: number;
  valueUsdM: number;
  sharePct: number;
  rank: number;
}

export interface DgcisExportsData {
  /** The prefix that was queried, as supplied by the caller. */
  hsCode: string;
  description: string;
  financialYear: string;
  totalUsd: number;
  totalUsdM: number;
  destinations: DgcisDestination[];
  /**
   * How many 8-digit tariff lines were summed to produce these figures.
   * 1 means the answer is a single line; more means it is an aggregate across
   * every Indian tariff line under the requested prefix. The narrative must
   * disclose this — "HS 420221" covers several distinct tariff items and a
   * manufacturer should know the number spans all of them.
   */
  linesAggregated: number;
}

/**
 * India's exports under an HS prefix, by destination, from vendored DGCIS data.
 *
 * WHY THIS AGGREGATES RATHER THAN LOOKING UP ONE CODE: DGCIS publishes at
 * India's 8-digit tariff line, but classification deliberately resolves to 6
 * digits (see classify.ts — an 8-digit code reaching a Comtrade query returns
 * TOTAL trade rather than an error, so the codebase never lets one through).
 * Callers therefore arrive holding 6 digits. We sum every 8-digit line sharing
 * that prefix, per destination, and report how many lines went into the total
 * so the caller can say so.
 *
 * Accepts a 2, 4, 6 or 8 digit prefix. Returns null when nothing matches — a
 * real gap, either genuinely untraded or absent from the last manual refresh,
 * and not something to paper over.
 */
export function dgcisIndiaExports(
  hsCode: string,
  limit = 5
): DgcisExportsData | null {
  const prefix = hsCode.replace(/\D/g, "");
  if (![2, 4, 6, 8].includes(prefix.length)) return null;

  const matches = Object.entries(FILE.entries).filter(([code]) =>
    code.startsWith(prefix)
  );
  if (matches.length === 0) return null;

  // Sum each destination across every matching tariff line.
  const byDestination = new Map<string, number>();
  let totalUsd = 0;
  for (const [, entry] of matches) {
    totalUsd += entry.totalUsd;
    for (const d of entry.destinations) {
      byDestination.set(d.iso3, (byDestination.get(d.iso3) ?? 0) + d.valueUsd);
    }
  }
  if (totalUsd <= 0) return null;

  const destinations: DgcisDestination[] = [...byDestination.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([iso3, valueUsd], i) => ({
      iso3,
      valueUsd,
      valueUsdM: Math.round((valueUsd / 1_000_000) * 10) / 10,
      sharePct: Math.round((valueUsd / totalUsd) * 1000) / 10,
      rank: i + 1,
    }));

  // With one line the published description is exact. Across several it would
  // be misleading to present any single line's wording as the whole, so leave
  // it to the caller to describe the prefix.
  const description = matches.length === 1 ? matches[0][1].description : "";

  return {
    hsCode: prefix,
    description,
    financialYear: FILE.financialYear,
    totalUsd,
    totalUsdM: Math.round((totalUsd / 1_000_000) * 10) / 10,
    destinations,
    linesAggregated: matches.length,
  };
}

/** Number of HS8 codes covered by the current vendored export — for diagnostics. */
export function dgcisCodeCount(): number {
  return FILE.hsCodeCount;
}
