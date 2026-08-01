/**
 * GST rate lookup — Notification 9/2025-Integrated Tax (Rate).
 *
 * The one duty-adjacent dataset in this codebase sourced from a SINGLE clean
 * document rather than a base-plus-amendments chain. GST 2.0 (22 Sept 2025)
 * replaced a decade of fragmented notifications with one HSN-organised
 * schedule, which is what makes this buildable at all — see build-gst.py for
 * why Duty Drawback needed heading-level disclosure and why BCD isn't in this
 * codebase at all (no consolidated source exists for it, full stop).
 *
 * RESOLUTION IS LONGEST-PREFIX, LIKE ITCHS PARENT INHERITANCE
 * The source states rates at whatever HSN depth the law specifies — a bare
 * 2-digit chapter, a 4-digit heading, occasionally a full 8-digit tariff
 * item. Given an 8-digit code, we check for an explicit entry at 8, then 6,
 * then 4, then 2 digits, and use the most specific one that exists.
 *
 * SAME-LENGTH CONFLICTS ARE REAL, NOT PARSER NOISE
 * Chapter 61 (apparel) carries both 5% and 18% entries — that's GST's actual
 * value-based split (affordable apparel under a price threshold is 5%, above
 * it 18%), which cannot be resolved from an HSN code alone. Rather than guess,
 * we surface every candidate rate and say why, the same discipline already
 * applied to Duty Drawback's mismatched headings.
 *
 * UNLISTED IS NOT UNKNOWN
 * Schedule II's own text includes "Any Chapter Goods which are not specified
 * in Schedule I, III, IV, V, VI or VII" — the notification defines its own
 * catch-all. A code with no explicit entry is 18% by construction, and we say
 * so rather than returning null the way an unresolved RoDTEP or Drawback
 * lookup does.
 */

import raw from "./gst.json";

interface RawEntry {
  c: string; // HSN prefix as published: 2, 4, 6 or 8 digits
  l: number; // digit length of c
  rate: number; // percent
  sched: string; // Roman numeral, I-VII
  row: number; // row number in the notification, for citation
}

interface RawFile {
  notification: string;
  sourceUrl: string;
  catchAllRate: number;
  catchAllNote: string;
  note: string;
  count: number;
  conflictCount: number;
  conflicts: Record<string, number[]>;
  entries: RawEntry[];
}

const FILE = raw as RawFile;

export interface GstMatch {
  rate: number;
  schedule: string;
  matchedPrefix: string;
}

export interface GstResult {
  /** True only when exactly one rate applies at the most specific level found. */
  unambiguous: boolean;
  /** All candidates at the most specific matching level — length 1 when unambiguous. */
  candidates: GstMatch[];
  /** True when nothing more specific than the chapter default (or nothing at all) matched. */
  isCatchAll: boolean;
}

export const GST_SOURCE = {
  notification: FILE.notification,
  sourceUrl: FILE.sourceUrl,
  catchAllRate: FILE.catchAllRate,
  catchAllNote: FILE.catchAllNote,
} as const;

let BY_CODE: Map<string, RawEntry[]> | null = null;

function build() {
  if (BY_CODE) return;
  const m = new Map<string, RawEntry[]>();
  for (const e of FILE.entries) {
    const arr = m.get(e.c);
    if (arr) arr.push(e);
    else m.set(e.c, [e]);
  }
  BY_CODE = m;
}

/**
 * GST rate for an HS/ITC-HS code, at whatever length is passed (2-8 digits).
 * Walks from the full code down to its 2-digit chapter, using the first
 * length that has an explicit entry; falls back to the notification's own
 * 18% catch-all if nothing more specific exists anywhere in the chapter.
 */
export function lookupGst(hsCode: string): GstResult {
  build();
  const digits = hsCode.replace(/\D/g, "");

  for (let len = Math.min(digits.length, 8); len >= 2; len--) {
    const prefix = digits.slice(0, len);
    const hits = BY_CODE!.get(prefix);
    if (!hits || hits.length === 0) continue;

    const distinctRates = [...new Set(hits.map((h) => h.rate))];
    const candidates: GstMatch[] = distinctRates.map((rate) => {
      const h = hits.find((x) => x.rate === rate)!;
      return { rate, schedule: h.sched, matchedPrefix: prefix };
    });

    return {
      unambiguous: distinctRates.length === 1,
      candidates,
      isCatchAll: false,
    };
  }

  return {
    unambiguous: true,
    candidates: [{ rate: FILE.catchAllRate, schedule: "II (catch-all)", matchedPrefix: "" }],
    isCatchAll: true,
  };
}

/** The sentence a caller shows, with the ambiguity or catch-all disclosed. */
export function describeGst(result: GstResult): string {
  if (result.isCatchAll) {
    return (
      `GST ${FILE.catchAllRate}% (Schedule II catch-all — no explicit entry for this ` +
      `code; ${FILE.catchAllNote})`
    );
  }
  if (result.unambiguous) {
    const c = result.candidates[0];
    return `GST ${c.rate}% (Schedule ${c.schedule}, HSN ${c.matchedPrefix})`;
  }
  const rates = result.candidates.map((c) => `${c.rate}% (Schedule ${c.schedule})`).join(" or ");
  return (
    `GST rate for HSN ${result.candidates[0].matchedPrefix} depends on the specific item: ` +
    `${rates}. This heading has more than one rate in the notification — commonly a value or ` +
    `end-use split (e.g. apparel is 5% below a price threshold, 18% above it). Confirm which ` +
    `applies with a GST practitioner.`
  );
}

/** Distinct codes covered — used by diagnostics and tests. */
export function gstDatasetSize(): number {
  build();
  return BY_CODE!.size;
}
