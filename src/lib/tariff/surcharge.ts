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
 * CBAM is not a percentage of value at all — it is priced per tonne of embedded
 * carbon, above a 50-tonne threshold, and the certificates are not purchasable
 * until February 2027. Adding a flat number to a landed cost would produce a
 * figure that is confidently wrong, which is worse than one honestly incomplete.
 *
 * WHAT THAT REASONING MISSED
 * It framed the choice as add-it or omit-it, and both are bad. Omitting is not
 * neutral: on the United States, India's largest market, a landed cost built on
 * MFN alone understates the buyer's duty by 18% of customs value, and an
 * exporter reading the headline figure can underprice a real shipment. A caveat
 * under the number does not fix that, because the number is what gets quoted.
 *
 * So a third option, used here for ad valorem measures only: compute the figure
 * CONDITIONALLY and label it as such. "If this measure applies to your line,
 * your buyer pays X rather than Y" is not a claim about which rate applies. It
 * is arithmetic on a stated premise, and it gives the exporter the one number
 * they cannot afford to be missing. The unconditional landed cost is unchanged
 * and still leads.
 *
 * SCOPE IS NOW THREE-VALUED, NOT TWO
 * The February 2026 joint statement names categories on both sides, so a
 * chapter can be positively in scope, positively exempt, or unnamed. Collapsing
 * unnamed into either one is a guess; it gets its own value and its own
 * sentence.
 *
 * THESE RATES GO STALE, AND FAST
 * The US measure moved four times in twelve months: 25% in August 2025, plus a
 * separate 25% oil penalty, both cut to 18% in February 2026, with further
 * reporting since July 2026 we have not been able to confirm against a primary
 * source. Every measure therefore carries an asOf date, and every sentence
 * built from one says when it was last checked rather than implying it is live.
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
  /**
   * Chapters a source positively names as EXEMPT. Distinct from "not in
   * `chapters`", which only means unnamed. Used to keep an exporter from being
   * warned about a measure their goods are documented to be outside of.
   */
  exemptChapters?: string[];
  /**
   * When we last checked this measure against its source. Measures like this
   * one change several times a year, and a `since` date alone reads as
   * currency it does not have.
   */
  asOf: string;
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
    asOf: "2026-08",
    // Categories the February 2026 joint statement names as carrying the 18%,
    // mapped to the chapters that hold them: organic chemicals (29), plastics
    // and rubber (39-40), leather (41-43), footwear (64), textiles and apparel
    // (50-63).
    //
    // The statement also names "home décor", "artisanal products" and "certain
    // machinery". Those are deliberately NOT mapped: décor and artisanal goods
    // scatter across chapters 44, 69, 70 and 94 alongside goods nobody would
    // call either, and "certain machinery" qualifies itself. Guessing them
    // would turn an unnamed chapter into a false positive, so they fall through
    // to "unknown" and the note says so.
    chapters: [
      "29", "39", "40", "41", "42", "43",
      "50", "51", "52", "53", "54", "55", "56", "57",
      "58", "59", "60", "61", "62", "63", "64",
    ],
    // Named for removal in the same statement: generic pharmaceuticals (30),
    // gems and diamonds (71), aircraft parts (88).
    exemptChapters: ["30", "71", "88"],
    source: "US–India joint statement, February 2026 (whitehouse.gov)",
    note:
      "Cut from 50% to 18% in February 2026, when the separate 25% duty tied to Russian oil " +
      "purchases was withdrawn. It is charged IN ADDITION TO the MFN rate, not instead of it. " +
      "The exemptions for pharmaceuticals, gems and aircraft parts are conditional on the " +
      "interim agreement being concluded. Home décor, artisanal products and certain " +
      "machinery are also named as in scope but do not map onto whole chapters, so goods of " +
      "that kind may be in scope even where this says otherwise. Reporting since July 2026 " +
      "points to further changes we could not confirm against a primary source — treat 18% " +
      "as the last rate we verified, not as today's certainty, and check before you quote.",
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
  asOf: "2026-08",
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

/**
 * Where a product sits relative to a measure.
 *
 * "unknown" is the honest majority case for the US measure and must not be
 * collapsed into either neighbour: reading it as in-scope invents a cost, and
 * reading it as exempt hides one.
 */
export type SurchargeScope = "in-scope" | "out-of-scope" | "unknown";

export interface SurchargeLookup {
  measure: SurchargeMeasure;
  /**
   * True only when the product's chapter is positively in scope. Kept as the
   * narrow question it always answered; `scope` carries the full answer.
   */
  coversProduct: boolean;
  scope: SurchargeScope;
  /**
   * The rate to apply IF the measure bites — for the in-scope case and, as an
   * exposure, for the unknown one. null where the measure is not ad valorem
   * (CBAM) or the product is documented outside it, because in neither case is
   * there a percentage that would mean anything.
   */
  applicableRatePct: number | null;
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

  const rateFor = (scope: SurchargeScope): number | null =>
    scope === "out-of-scope" ? null : measure.headlineRatePct;

  const build = (scope: SurchargeScope): SurchargeLookup => ({
    measure,
    coversProduct: scope === "in-scope",
    scope,
    applicableRatePct: rateFor(scope),
  });

  // No product, or a measure on all goods: nothing to scope out.
  if (!hsCode || (!measure.chapters && !measure.exemptChapters)) {
    return build("in-scope");
  }

  const chapter = hsCode.replace(/\D/g, "").slice(0, 2);

  // Exemptions are checked first. A chapter named on both lists would be a
  // data error, and reading it as exempt is the direction that does not
  // invent a cost the exporter would then price in.
  if (measure.exemptChapters?.includes(chapter)) return build("out-of-scope");
  if (measure.chapters?.includes(chapter)) return build("in-scope");

  // A measure that names only what it covers leaves everything else outside
  // it; one that names exemptions too has an unnamed middle we cannot resolve.
  return build(measure.exemptChapters ? "unknown" : "out-of-scope");
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
  const provenance = `Source: ${m.source}, as we last checked it in ${m.asOf}.`;

  if (lookup.scope === "out-of-scope") {
    const named = m.exemptChapters !== undefined;
    return (
      `${m.name} has applied since ${m.since}, but this product's chapter is ` +
      (named ? `named as exempt from it` : `not among the goods it covers`) +
      `, so it should not bite here. Scope is defined below chapter level, so confirm if the ` +
      `value at stake is material. ${provenance}`
    );
  }

  if (m.kind === "carbon-levy") {
    return (
      `${m.name} applies to this destination and covers goods in this product's chapter, ` +
      `and it is NOT included in the duty above. ${m.note} ${provenance}`
    );
  }

  const rate = m.headlineRatePct !== null ? `${m.headlineRatePct}%` : "an unpublished rate";

  if (lookup.scope === "unknown") {
    return (
      `${m.name} applies to goods from India at ${rate} on top of the MFN rate, and we ` +
      `cannot tell from the tariff line whether your product is in scope — the measure names ` +
      `categories that do not map onto whole chapters. The duty above therefore may be too ` +
      `low. Settle this before you quote; the figure alongside shows what it costs if it ` +
      `does apply. ${m.note} ${provenance}`
    );
  }

  return (
    `${m.name} applies to this product at ${rate} ON TOP OF the MFN rate above, so the duty ` +
    `shown alone understates what your buyer pays. The figure alongside includes it. ` +
    `${m.note} ${provenance}`
  );
}

/** Destinations carrying a measure — used by diagnostics and tests. */
export function surchargeCoverage(): number {
  return Object.keys(MEASURES).length + EU_MEMBERS.length;
}
