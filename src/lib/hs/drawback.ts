/**
 * Duty Drawback — All Industry Rates.
 *
 * Refunds the customs duty paid on imported inputs that went into an exported
 * product. With RoDTEP it forms the pair of incentives an exporter actually
 * claims, so the two are surfaced together.
 *
 * WHY THIS IS KEYED ON THE 4-DIGIT HEADING AND RoDTEP IS NOT
 * RoDTEP is published against real 8-digit ITC-HS tariff items and joins
 * cleanly. The Drawback Schedule carries its own numbering that follows the
 * Customs Tariff only to 4 digits and then subdivides on its own terms. Of the
 * drawback schedule's 8-digit codes, ZERO are valid ITC-HS codes; of its
 * 6-digit codes, 6% are. Only the 4-digit headings agree, and those agree
 * completely.
 *
 * So drawback item 42020101 is not tariff line 42022110, even though both
 * describe leather bags. Presenting a drawback rate as belonging to a specific
 * ITC-HS line would be a fabricated join — a confidently wrong number of exactly
 * the kind the rest of this codebase is built to avoid.
 *
 * What we do instead: resolve to the heading, and return every drawback item
 * under it. Where a heading holds one rate the answer is precise. Where it holds
 * several, the caller gets a shortlist and must say the choice is unconfirmed.
 *
 * Regenerate with `python scripts/build-drawback.py`.
 */

import raw from "./drawback.json";

interface RawItem {
  c: string; // drawback tariff item — NOT an ITC-HS code
  t: string; // description, best-effort from the PDF layout
  u: string; // unit the cap applies to
  r: number; // rate, percentage of FOB
  cap: number | null; // rupees per unit, where one applies
}

interface RawFile {
  schedule: string;
  notification: string;
  sourceUrl: string;
  keyedBy: string;
  mismatchWarning: string;
  note: string;
  headingCount: number;
  itemCount: number;
  headings: Record<string, RawItem[]>;
}

const FILE = raw as RawFile;

export interface DrawbackItem {
  /** Drawback tariff item. Not an ITC-HS code — see the note above. */
  drawbackItem: string;
  /** Description as published, may be sparse where the PDF layout was poor. */
  description: string;
  /** Unit the cap is measured against. */
  unit: string;
  /** Rate as a percentage of FOB value. */
  ratePct: number;
  /** Ceiling in rupees per unit, where the schedule sets one. */
  capPerUnitInr: number | null;
}

export interface DrawbackResult {
  /** The 4-digit HS heading the rate was resolved against. */
  heading: string;
  /** Every drawback item under that heading. */
  items: DrawbackItem[];
  /**
   * True when the heading carries exactly one rate, so it applies whichever
   * sub-item the goods fall under. False means the caller must present the
   * shortlist rather than pick.
   */
  unambiguous: boolean;
}

export const DRAWBACK_SOURCE = {
  schedule: FILE.schedule,
  notification: FILE.notification,
  keyedBy: FILE.keyedBy,
  mismatchWarning: FILE.mismatchWarning,
  note: FILE.note,
} as const;

function toItem(r: RawItem): DrawbackItem {
  return {
    drawbackItem: r.c,
    description: r.t,
    unit: r.u,
    ratePct: r.r,
    capPerUnitInr: r.cap,
  };
}

/**
 * Drawback rates for the heading an ITC-HS code sits under.
 *
 * Accepts a 4, 6 or 8 digit code and uses only the first four, because that is
 * the deepest level at which the two classifications agree. Returns null when
 * the heading has no drawback entry — a real answer, not a gap.
 */
export function drawbackForHsCode(code: string): DrawbackResult | null {
  const heading = code.replace(/\D/g, "").slice(0, 4);
  if (heading.length !== 4) return null;

  const items = FILE.headings[heading];
  if (!items || items.length === 0) return null;

  const mapped = items.map(toItem);
  const distinctRates = new Set(mapped.map((i) => i.ratePct));

  return {
    heading,
    items: mapped,
    unambiguous: distinctRates.size === 1,
  };
}

/**
 * A sentence a caller can show, with the classification mismatch attached.
 *
 * Never returns a bare percentage for an ambiguous heading — the whole point is
 * that the exporter has to choose.
 */
export function describeDrawback(result: DrawbackResult): string {
  if (result.unambiguous) {
    const r = result.items[0];
    const cap =
      r.capPerUnitInr !== null
        ? `, capped at Rs ${r.capPerUnitInr} per ${r.unit || "unit"}`
        : "";
    return (
      `Duty Drawback ${r.ratePct}% of FOB${cap} for HS heading ${result.heading}. ` +
      `${DRAWBACK_SOURCE.notification}.`
    );
  }

  const spread = result.items
    .map((i) => `${i.drawbackItem} ${i.ratePct}%${i.description ? ` (${i.description})` : ""}`)
    .join("; ");
  return (
    `Duty Drawback for HS heading ${result.heading} depends on the drawback item: ${spread}. ` +
    `${DRAWBACK_SOURCE.mismatchWarning}`
  );
}

/** Number of headings covered — used by diagnostics and tests. */
export function drawbackHeadingCount(): number {
  return Object.keys(FILE.headings).length;
}
