/**
 * India's 8-digit tariff line — ITC(HS) 2022 Schedule 2, Export Policy.
 *
 * The international nomenclature in hs-codes.json stops at 6 digits. A shipping
 * bill carries 8: the last two are India's own tariff line, and they determine
 * the export policy that applies. Saathi previously — and correctly — told users
 * those two digits had to be confirmed with DGFT. This module supplies them from
 * the DGFT notification itself.
 *
 * DELIBERATELY SEPARATE FROM classify.ts. Every trade-data query we make goes to
 * UN Comtrade, which speaks 6-digit HS and nothing else. Folding 8-digit codes
 * into the main search index would risk handing Comtrade a code it cannot
 * resolve, and Comtrade answers an unrecognised code with TOTAL trade rather
 * than an error — a silent, enormous overstatement. So classification still
 * resolves to 6 digits, and the tariff line is looked up from there.
 *
 * Regenerate with `python scripts/build-itchs.py` when DGFT amends the schedule.
 */

import raw from "./itchs-export.json";

/** Export policy DGFT assigns to a tariff line. */
export type ExportPolicy = "Free" | "Restricted" | "Prohibited" | "STE";

interface RawEntry {
  c: string; // 8-digit ITC-HS code
  t: string; // official description
  u: string; // unit of quantity
  pol: string; // export policy
  cond: string; // policy condition, may be empty
  p: string; // 6-digit HS parent
}

interface RawFile {
  source: string;
  sourceUrl: string;
  note: string;
  count: number;
  entries: RawEntry[];
}

const FILE = raw as RawFile;

export interface TariffLine {
  /** 8-digit ITC-HS code, as it appears on a shipping bill. */
  code: string;
  /** DGFT's own description of the line. */
  description: string;
  /** Unit of quantity, or "-" where none is specified. */
  unit: string;
  /** Free, Restricted, Prohibited or STE (state trading enterprise). */
  policy: ExportPolicy;
  /** The condition attached to that policy, where one exists. */
  condition: string;
  /** The 6-digit international HS heading this sits under. */
  hsParent: string;
}

/** Where this data came from, and the caveat that must travel with it. */
export const ITCHS_SOURCE = {
  name: FILE.source,
  url: FILE.sourceUrl,
  note: FILE.note,
} as const;

let BY_CODE: Map<string, TariffLine> | null = null;
let BY_PARENT: Map<string, TariffLine[]> | null = null;

function isPolicy(v: string): v is ExportPolicy {
  return v === "Free" || v === "Restricted" || v === "Prohibited" || v === "STE";
}

function build() {
  if (BY_CODE) return;
  const byCode = new Map<string, TariffLine>();
  const byParent = new Map<string, TariffLine[]>();

  for (const e of FILE.entries) {
    // The build script already rejects rows without a recognised policy; this
    // guard keeps the type honest rather than casting.
    if (!isPolicy(e.pol)) continue;

    const line: TariffLine = {
      code: e.c,
      description: e.t,
      unit: e.u,
      policy: e.pol,
      condition: e.cond,
      hsParent: e.p,
    };
    byCode.set(e.c, line);
    const siblings = byParent.get(e.p);
    if (siblings) siblings.push(line);
    else byParent.set(e.p, [line]);
  }

  BY_CODE = byCode;
  BY_PARENT = byParent;
}

/**
 * The Indian tariff lines sitting under a 6-digit HS heading.
 *
 * This is the normal entry point: classification resolves a 6-digit code, then
 * this narrows it to the 8-digit lines the exporter must choose between. Many
 * headings have exactly one child, in which case the choice is made for them.
 */
export function tariffLinesFor(hsCode6: string): TariffLine[] {
  build();
  const key = hsCode6.replace(/\D/g, "").slice(0, 6);
  return BY_PARENT!.get(key) ?? [];
}

/** Look up a specific 8-digit tariff line. */
export function lookupTariffLine(code: string): TariffLine | null {
  build();
  return BY_CODE!.get(code.replace(/\D/g, "")) ?? null;
}

/**
 * Whether a product can be exported at all under this line.
 *
 * Returned separately from the line itself because it is the one field a
 * manufacturer must not miss: 93 of the 12,310 lines are Prohibited outright
 * and another 130 need a Restricted-export authorisation.
 */
export function exportability(code: string): {
  policy: ExportPolicy;
  condition: string;
  freelyExportable: boolean;
} | null {
  const line = lookupTariffLine(code);
  if (!line) return null;
  return {
    policy: line.policy,
    condition: line.condition,
    freelyExportable: line.policy === "Free",
  };
}

/** Size of the bundled schedule — used by diagnostics and tests. */
export function itchsDatasetSize(): number {
  build();
  return BY_CODE!.size;
}
