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
  hsCode: string;
  description: string;
  financialYear: string;
  totalUsd: number;
  totalUsdM: number;
  destinations: DgcisDestination[];
}

/**
 * India's exports of an 8-digit HS code, by destination, from vendored DGCIS
 * data. Returns null when the code isn't in the current export (a real gap —
 * either genuinely untraded or just not in the last manual refresh — not
 * something to guess around).
 */
export function dgcisIndiaExports(
  hsCode: string,
  limit = 5
): DgcisExportsData | null {
  const hs8 = hsCode.replace(/\D/g, "");
  if (hs8.length !== 8) return null;

  const entry = FILE.entries[hs8];
  if (!entry || entry.destinations.length === 0) return null;

  const destinations: DgcisDestination[] = entry.destinations
    .slice(0, limit)
    .map((d, i) => ({
      iso3: d.iso3,
      valueUsd: d.valueUsd,
      valueUsdM: Math.round((d.valueUsd / 1_000_000) * 10) / 10,
      sharePct:
        entry.totalUsd > 0
          ? Math.round((d.valueUsd / entry.totalUsd) * 1000) / 10
          : 0,
      rank: i + 1,
    }));

  return {
    hsCode: hs8,
    description: entry.description,
    financialYear: FILE.financialYear,
    totalUsd: entry.totalUsd,
    totalUsdM: Math.round((entry.totalUsd / 1_000_000) * 10) / 10,
    destinations,
  };
}

/** Number of HS8 codes covered by the current vendored export — for diagnostics. */
export function dgcisCodeCount(): number {
  return FILE.hsCodeCount;
}
