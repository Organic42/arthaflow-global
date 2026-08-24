/**
 * Measures that push a buyer's cost ABOVE the MFN rate — eligibility, not rates.
 *
 * WHY THIS EXISTS
 * destination.ts serves MFN rates from WITS TRAINS. MFN is the rate a country
 * charges any WTO member absent something else, and for most of this decade
 * that was close enough to what an Indian exporter's buyer actually paid.
 * It no longer is. Two layers now sit on top of it and TRAINS carries neither:
 *
 *   - Country-specific reciprocal and punitive tariffs. The United States has
 *     applied one to Indian goods since 2025. TRAINS reports the US MFN rate
 *     on leather handbags as 8.1%; the rate an Indian consignment actually
 *     meets is 18%. A landed cost built on MFN alone understates the buyer's
 *     duty by roughly ten points on India's single largest export market.
 *   - Carbon border levies. The EU's CBAM entered its definitive period on
 *     1 January 2026 and is a real cost on Indian steel, aluminium, cement and
 *     fertiliser entering the bloc, charged on embedded emissions rather than
 *     on invoice value.
 *
 * THE SYMMETRY WITH fta.ts, DELIBERATE
 * fta.ts tells a manufacturer the duty shown may be LOWER than what their
 * buyer pays, and refuses to state a preferential rate it does not hold.
 * Nothing told them it may be HIGHER. This module is the same discipline
 * pointed the other way, and it follows the same rule: it will not invent a
 * per-line number.
 *
 * WHY NOT JUST ADD THE PERCENTAGE TO THE DUTY
 * Because scope varies by tariff line and we cannot verify it line by line.
 * The US measure is 18% on textiles, leather, footwear and machinery but zero
 * on spices, tea, coffee and several fruits. CBAM is not a percentage of value
 * at all — it is priced per tonne of embedded carbon, above a 50-tonne
 * threshold, and the certificates are not even purchasable until February
 * 2027. Adding a flat number to a landed cost would produce a figure that is
 * confidently wrong, which is worse than a figure that is honestly incomplete.
 *
 * So this module answers one step back, exactly as fta.ts does: does a measure
 * cover this destination and this product, what is the headline, and what must
 * the exporter go and confirm?
 */

export type SurchargeKind = "additional-tariff" | "carbon-levy";

export interface SurchargeMeasure {
  /** Short name as the trade press uses it. */
  name: string;
  kind: SurchargeKind;
  /**
   * Headline rate as a percentage of customs value, where the measure is
   * charged that way AND we can verify the number. null for measures that are
   * not ad valorem — CBAM is priced on embedded emissions, so any percentage
   * here would be fabricated.
   */
  headlineRatePct: number | null;
  /** When the measure began applying in its current form. */
  since: string;
  /**
   * HS chapters the measure covers, as 2-digit strings. null means all goods.
   * Chapter granularity is coarser than the measures themselves — CBAM is
   * defined on specific CN codes within these chapters — so a chapter match is
   * a flag to go and check, never a determination.
   */
  chapters: string[] | null;
  /** Who published it, so the claim is checkable. */
  source: string;
  /** What the exporter needs to know before quoting. */
  note: string;
}

/** Destinations in this table use the same ISO-3 keys as WITS_REPORTERS. */
export const MEASURES: Record<string, SurchargeMeasure> = {
  USA: {
    name: "US reciprocal tariff on Indian goods",
    kind: "additional-tariff",
    headlineRatePct: 18,
    since: "2026-02",
    chapters: null,
    source: "US–India joint statement, February 2026",
    note:
      "Cut from 50% to 18% in February 2026, when the additional 25% punitive duty was " +
      "withdrawn. Textiles and apparel, leather and footwear, plastics and rubber, organic " +
      "chemicals, home décor and certain machinery are in scope at 18%. Several " +
      "agricultural lines — spices, tea, coffee, cashew, and some fresh fruit — enter at " +
      "zero instead. Which applies to your line is the question to settle before quoting.",
  },
};

/**
 * CBAM covers the EU as a bloc, so every member in WITS_REPORTERS carries the
 * same measure rather than eleven near-identical entries in MEASURES.
 */
const EU_MEMBERS = [
  "BGR", "CZE", "DEU", "DNK", "ESP", "FRA", "GRC", "HUN", "IRL", "ITA", "NLD",
  "POL", "PRT", "ROU", "SWE",
];
// Montenegro is a candidate, not a member, so it is deliberately absent —
// CBAM does not apply to imports into it.

/**
 * Chapters holding CBAM Annex I goods: cement (25), electricity (27), hydrogen
 * and fertiliser precursors (28), fertilisers (31), iron and steel (72, 73),
 * aluminium (76). The regulation names specific CN codes inside these, so a
 * match here means "check", not "charged".
 */
const CBAM_CHAPTERS = ["25", "27", "28", "31", "72", "73", "76"];

const CBAM: SurchargeMeasure = {
  name: "EU Carbon Border Adjustment Mechanism (CBAM)",
  kind: "carbon-levy",
  headlineRatePct: null,
  since: "2026-01-01",
  chapters: CBAM_CHAPTERS,
  source: "European Commission, CBAM definitive period from 1 January 2026",
  note:
    "Charged on the carbon embedded in the goods, not on invoice value, so it cannot be " +
    "expressed as a percentage of your price. It falls on the EU importer, who must be a " +
    "registered CBAM declarant and have emissions verified by an accredited third party. " +
    "Imports below 50 tonnes of CBAM goods a year are out of scope. Certificate sales " +
    "start 1 February 2027 and the first surrender covering 2026 imports is due " +
    "30 September 2027 — so the obligation is live now even though the bill is not. " +
    "Expect EU buyers to ask you for emissions data.",
};

export interface SurchargeLookup {
  measure: SurchargeMeasure;
  /**
   * True when the measure's scope covers this product's chapter. False means
   * the destination has a measure but this product looks outside it — still
   * worth surfacing, because scope is defined below chapter level.
   */
  coversProduct: boolean;
}

/**
 * The measure applying to a destination, if any.
 *
 * `hsCode` may be 6 or 8 digits; only the chapter is used. Omit it and any
 * measure on the destination is returned with coversProduct true, since
 * without a product there is nothing to scope out.
 */
export function surchargeFor(iso3: string, hsCode?: string): SurchargeLookup | null {
  const iso = iso3.trim().toUpperCase();
  const measure = MEASURES[iso] ?? (EU_MEMBERS.includes(iso) ? CBAM : null);
  if (!measure) return null;

  if (!measure.chapters) return { measure, coversProduct: true };
  if (!hsCode) return { measure, coversProduct: true };

  const chapter = hsCode.replace(/\D/g, "").slice(0, 2);
  return { measure, coversProduct: measure.chapters.includes(chapter) };
}

/**
 * The sentence to attach to an MFN rate.
 *
 * Mirrors describeAgreement(): states the direction of the error and refuses
 * to compute the corrected figure, because scope is defined below the
 * granularity we can verify.
 */
export function describeSurcharge(lookup: SurchargeLookup): string {
  const m = lookup.measure;

  if (!lookup.coversProduct) {
    return (
      `${m.name} has applied since ${m.since} but is scoped to particular goods, and this ` +
      `product's chapter is not among them, so it most likely does not bite here. Scope is ` +
      `defined below chapter level, so confirm if the value at stake is material. ` +
      `Source: ${m.source}.`
    );
  }

  if (m.kind === "carbon-levy") {
    return (
      `${m.name} applies to this destination and covers goods in this product's chapter, ` +
      `and it is NOT included in the duty above. ${m.note} Source: ${m.source}.`
    );
  }

  return (
    `${m.name} applies on top of the MFN rate above, so the duty shown is LOWER than what ` +
    `your buyer will actually pay${
      m.headlineRatePct !== null ? `, with the headline rate at ${m.headlineRatePct}%` : ""
    }. We do not hold a per-line rate for this measure and will not estimate one. ` +
    `${m.note} Source: ${m.source}.`
  );
}

/** Destinations carrying a measure — used by diagnostics and tests. */
export function surchargeCoverage(): number {
  return Object.keys(MEASURES).length + EU_MEMBERS.length;
}
