/**
 * RoDTEP — Remission of Duties and Taxes on Exported Products.
 *
 * A rebate an exporter claims as a percentage of FOB value, capped per unit of
 * quantity. Unlike a duty, this is money coming back, so it changes whether a
 * shipment is worth making. It is the first number an exporter asks for and the
 * one where being wrong is most expensive.
 *
 * WHAT THIS MODULE WILL NOT DO
 * It will not tell you an effective rate. DGFT has limited benefits under this
 * schedule to 50% of notified rates, a limitation already extended once. We
 * return the notified rate and the limitation as separate facts, so a consumer
 * has to acknowledge both. Collapsing them into one number would produce a
 * figure that looks authoritative and silently rots the day the policy changes.
 *
 * Regenerate with `python scripts/build-rodtep.py`.
 */

import raw from "./rodtep.json";

interface RawEntry {
  c: string; // 8-digit tariff item
  t: string; // description as per CTH
  u: string; // unit of quantity
  r: number; // notified rate, percentage of FOB
  cap: number | null; // rupees per UQC, where one applies
}

interface RawFile {
  schedule: string;
  baseNotification: string;
  amendedBy: string;
  sourceUrls: string[];
  rationalisation: {
    factor: number;
    description: string;
    notifiedOn: string;
    verify: string;
  };
  note: string;
  count: number;
  entries: RawEntry[];
}

const FILE = raw as RawFile;

export interface RodtepRate {
  /** 8-digit tariff item. */
  code: string;
  /** Description as it appears in the schedule. */
  description: string;
  /** Unit of quantity the cap is measured against. */
  unit: string;
  /** Notified rate, as a percentage of FOB value. */
  notifiedRatePct: number;
  /** Ceiling in rupees per unit, where the schedule sets one. */
  capPerUnitInr: number | null;
}

/** The schedule this came from, and the limitation currently overlaying it. */
export const RODTEP_SOURCE = {
  schedule: FILE.schedule,
  baseNotification: FILE.baseNotification,
  amendedBy: FILE.amendedBy,
  note: FILE.note,
  rationalisation: FILE.rationalisation,
} as const;

let BY_CODE: Map<string, RodtepRate> | null = null;

function build() {
  if (BY_CODE) return;
  const m = new Map<string, RodtepRate>();
  for (const e of FILE.entries) {
    m.set(e.c, {
      code: e.c,
      description: e.t,
      unit: e.u,
      notifiedRatePct: e.r,
      capPerUnitInr: e.cap,
    });
  }
  BY_CODE = m;
}

/**
 * The RoDTEP rate for an 8-digit tariff item.
 *
 * Returns null when the line is not in the schedule — roughly 15% of export
 * lines aren't. That is a real answer ("no rebate for this line"), not a gap,
 * and callers must say so rather than implying a rate exists.
 */
export function lookupRodtep(code: string): RodtepRate | null {
  build();
  const key = code.replace(/\D/g, "");
  if (key.length !== 8) return null;
  return BY_CODE!.get(key) ?? null;
}

/**
 * One sentence a caller can show a user, with the limitation attached.
 *
 * Deliberately never states a single effective percentage — see the note at the
 * top of this file.
 */
export function describeRodtep(rate: RodtepRate): string {
  const cap =
    rate.capPerUnitInr !== null
      ? `, capped at Rs ${rate.capPerUnitInr} per ${rate.unit || "unit"}`
      : "";
  return (
    `RoDTEP notified rate ${rate.notifiedRatePct}% of FOB${cap}. ` +
    `${FILE.rationalisation.description} ${FILE.rationalisation.verify}`
  );
}

/** Size of the bundled schedule — used by diagnostics and tests. */
export function rodtepDatasetSize(): number {
  build();
  return BY_CODE!.size;
}
