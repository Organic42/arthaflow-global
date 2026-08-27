/**
 * Destination import VAT / GST.
 *
 * The largest missing piece in a landed-cost estimate. Germany charges 3% duty
 * on leather handbags and 19% VAT: leaving VAT out understates what the buyer
 * fronts by more than six times the duty.
 *
 * TWO THINGS MOST TOOLS GET WRONG
 *
 * 1. VAT is charged on CIF PLUS DUTY, not on CIF. It compounds on top of the
 *    duty rather than sitting beside it.
 *
 * 2. VAT is normally RECOVERABLE. A VAT-registered business importer reclaims
 *    import VAT as input tax credit, so for the B2B buyers our manufacturers
 *    sell to it is a cash-flow cost, not a cost of goods. Presenting it as
 *    "your buyer pays 19% more" would misprice the deal and make a perfectly
 *    competitive quote look uncompetitive. We return it separately, marked
 *    recoverable, and never fold it into a headline price comparison.
 *
 * WHAT THESE RATES ARE NOT
 * Standard rates only. Most countries apply reduced rates to food, medicines,
 * books and other categories, and the reduced rate is set per product — the
 * same granularity problem as the drawback schedule. A country-level rate is
 * therefore an approximation for any specific HS code, and the result says so.
 *
 * Source: VATupdate global rate table, January 2026 revision, cross-checked
 * against the standard rates published for the major corridors. Verify before
 * relying on it for a shipment; rates move with national budgets.
 */

/** When this table was last checked against the source. */
export const VAT_TABLE_AS_OF = "2026-01";
export const VAT_SOURCE =
  "VATupdate global VAT/GST rate table (Jan 2026 revision) and PwC Worldwide Tax " +
  "Summaries, cross-checked against each other where both cover a territory; EU rates " +
  "additionally checked against the Tax Foundation EU table and euvat.dev. Entries " +
  "resting on a single source say so in their own note";

export interface VatRate {
  /** Standard rate as a percentage, or null where the country levies none. */
  standardRatePct: number | null;
  /** Local name, because "VAT" is not what everyone calls it. */
  label: string;
  /** Anything that materially qualifies the number. */
  note?: string;
}

/**
 * Keyed to the same ISO-3 codes as WITS_REPORTERS so the two compose.
 *
 * A country absent from this table yields "unknown", not zero — an unstated
 * rate and a genuine absence of VAT are different answers, and only the United
 * States, Hong Kong, Qatar and Kuwait are the latter.
 */
export const VAT_RATES: Record<string, VatRate> = {
  ARE: { standardRatePct: 5, label: "VAT" },
  ARG: { standardRatePct: 21, label: "IVA" },
  AUS: {
    standardRatePct: 10,
    label: "GST",
    note:
      "Charged on the value of the taxable importation - customs value plus duty plus " +
      "transport and insurance - which is the same base used here. Consignments below the " +
      "A$1,000 low-value threshold are handled differently.",
  },
  BEN: {
    standardRatePct: 18,
    label: "TVA",
    note:
      "WAEMU harmonised band (15-20%). Rate per the US Department of Commerce import guide.",
  },
  BGR: { standardRatePct: 20, label: "VAT" },
  CAN: {
    standardRatePct: 5,
    label: "GST",
    note: "5% federal GST; provinces add PST or apply a combined HST of 13-15%.",
  },
  CHL: { standardRatePct: 19, label: "IVA" },
  CHN: { standardRatePct: 13, label: "VAT" },
  CIV: { standardRatePct: 18, label: "TVA" },
  CMR: {
    standardRatePct: 19.25,
    label: "TVA",
    note:
      "Includes the additional council tax that applies on top of the 17.5% base rate.",
  },
  COD: {
    standardRatePct: 16,
    label: "TVA",
    note:
      "Rate from PwC Worldwide Tax Summaries; not in the VATupdate table, so " +
      "single-sourced.",
  },
  COL: { standardRatePct: 19, label: "IVA" },
  CZE: { standardRatePct: 21, label: "VAT" },
  DEU: { standardRatePct: 19, label: "VAT" },
  DNK: { standardRatePct: 25, label: "VAT" },
  ECU: { standardRatePct: 15, label: "IVA" },
  EGY: { standardRatePct: 14, label: "VAT" },
  ESP: { standardRatePct: 21, label: "IVA" },
  ETH: { standardRatePct: 15, label: "VAT" },
  FRA: { standardRatePct: 20, label: "TVA" },
  GBR: { standardRatePct: 20, label: "VAT" },
  GHA: {
    standardRatePct: 20,
    label: "VAT",
    note:
      "Effective rate from 1 January 2026 under the VAT Act 2025 (Act 1151): a 15% base " +
      "plus NHIL and GETFund at 2.5% each, now recoupled with VAT so a registered buyer can " +
      "claim them as input tax. Down from roughly 21.9%, because the COVID-19 levy was " +
      "abolished.",
  },
  GIN: {
    standardRatePct: 18,
    label: "TVA",
    note:
      "Single-sourced; confirm before relying on it for a large consignment.",
  },
  GRC: {
    standardRatePct: 24,
    label: "ΦΠΑ",
    note:
      "Greece applies a reduced set of rates on several Aegean islands, so a consignment " +
      "landing there can face less than 24%. Rate confirmed January 2026 against the Tax " +
      "Foundation EU table and euvat.dev, both citing the European Commission.",
  },
  GUY: {
    standardRatePct: 14,
    label: "VAT",
    note:
      "Rate from PwC Worldwide Tax Summaries; not in the VATupdate table, so " +
      "single-sourced.",
  },
  HKG: {
    standardRatePct: null,
    label: "none",
    note: "Hong Kong levies no VAT, GST or sales tax on imports.",
  },
  HUN: {
    standardRatePct: 27,
    label: "ÁFA",
    note:
      "The highest standard VAT rate in the EU. Rate confirmed January 2026 against the " +
      "Tax Foundation EU table and euvat.dev, both citing the European Commission.",
  },
  IDN: { standardRatePct: 11, label: "PPN" },
  IND: { standardRatePct: 18, label: "IGST" },
  IRL: { standardRatePct: 23, label: "VAT" },
  ISR: { standardRatePct: 18, label: "VAT" },
  ITA: { standardRatePct: 22, label: "IVA" },
  JOR: { standardRatePct: 16, label: "GST" },
  JPN: { standardRatePct: 10, label: "Consumption Tax" },
  KEN: { standardRatePct: 16, label: "VAT" },
  KOR: { standardRatePct: 10, label: "VAT" },
  KWT: {
    standardRatePct: null,
    label: "none",
    note: "Kuwait has not implemented VAT despite the GCC framework agreement.",
  },
  LKA: {
    standardRatePct: 18,
    label: "VAT",
    note:
      "Rate from the VATupdate 2026 table; not covered by the PwC chart, so single-sourced.",
  },
  MAR: { standardRatePct: 20, label: "TVA" },
  MDG: {
    standardRatePct: 20,
    label: "TVA",
    note:
      "Rate from PwC Worldwide Tax Summaries; not in the VATupdate table, so " +
      "single-sourced.",
  },
  MEX: { standardRatePct: 16, label: "IVA" },
  MNE: { standardRatePct: 21, label: "PDV" },
  MOZ: {
    standardRatePct: 16,
    label: "IVA",
    note:
      "Rate from PwC Worldwide Tax Summaries; not in the VATupdate table, so " +
      "single-sourced.",
  },
  MYS: {
    standardRatePct: 10,
    label: "SST",
    note: "Sales and Service Tax, not a VAT — rates run 6-10% and it is not recoverable as input credit the way VAT is.",
  },
  NGA: { standardRatePct: 7.5, label: "VAT" },
  NLD: { standardRatePct: 21, label: "BTW" },
  NOR: { standardRatePct: 25, label: "MVA" },
  NPL: {
    standardRatePct: 13,
    label: "VAT",
    note:
      "Rate from the VATupdate 2026 table; not covered by the PwC chart, so single-sourced.",
  },
  NZL: { standardRatePct: 15, label: "GST" },
  OMN: { standardRatePct: 5, label: "VAT" },
  PER: { standardRatePct: 18, label: "IGV" },
  PHL: { standardRatePct: 12, label: "VAT" },
  POL: { standardRatePct: 23, label: "VAT" },
  PRT: { standardRatePct: 23, label: "IVA" },
  QAT: {
    standardRatePct: null,
    label: "none",
    note: "Qatar has not implemented VAT despite the GCC framework agreement.",
  },
  ROU: {
    standardRatePct: 21,
    label: "TVA",
    note:
      "Raised from 19% to 21% on 1 August 2025, so quotes prepared before that date " +
      "understate it. Rate confirmed January 2026 against the Tax Foundation EU table and " +
      "euvat.dev, both citing the European Commission.",
  },
  RUS: {
    standardRatePct: 20,
    label: "VAT",
    note:
      "Rate from the VATupdate 2026 table; not covered by the PwC chart, so single-sourced.",
  },
  SAU: { standardRatePct: 15, label: "VAT" },
  SEN: { standardRatePct: 18, label: "TVA" },
  SGP: { standardRatePct: 9, label: "GST" },
  SWE: { standardRatePct: 25, label: "VAT" },
  THA: {
    standardRatePct: 7,
    label: "VAT",
    note: "Scheduled to rise to 10% on 1 October 2026 — check the shipment date.",
  },
  TUR: { standardRatePct: 20, label: "KDV" },
  TWN: { standardRatePct: 5, label: "VAT" },
  TZA: { standardRatePct: 18, label: "VAT" },
  UGA: { standardRatePct: 18, label: "VAT" },
  USA: {
    standardRatePct: null,
    label: "none",
    note: "The United States levies no VAT on imports. State sales tax applies at retail, not at the border.",
  },
  VEN: {
    standardRatePct: 16,
    label: "IVA",
    note:
      "Rate from PwC Worldwide Tax Summaries; not in the VATupdate table, so " +
      "single-sourced.",
  },
  VNM: { standardRatePct: 10, label: "VAT" },
  ZAF: { standardRatePct: 15, label: "VAT" },
  ZMB: { standardRatePct: 16, label: "VAT" },
};

export interface VatAssessment {
  iso3: string;
  label: string;
  ratePct: number;
  /** CIF plus duty — VAT compounds on the duty, it does not sit beside it. */
  baseInr: number;
  amountInr: number;
  /** True for genuine VAT/GST: a registered business buyer reclaims it. */
  recoverable: boolean;
  note?: string;
}

/**
 * VAT on an import, or null where the country levies none or we hold no rate.
 *
 * `dutyPaidValueInr` must already include the duty. Passing CIF alone silently
 * understates the VAT by the VAT rate applied to the duty.
 */
export function assessVat(
  iso3: string,
  dutyPaidValueInr: number
): VatAssessment | null {
  const iso = iso3.trim().toUpperCase();
  const entry = VAT_RATES[iso];
  if (!entry || entry.standardRatePct === null) return null;

  return {
    iso3: iso,
    label: entry.label,
    ratePct: entry.standardRatePct,
    baseInr: Math.round(dutyPaidValueInr * 100) / 100,
    amountInr: Math.round(((dutyPaidValueInr * entry.standardRatePct) / 100) * 100) / 100,
    // SST is a sales tax, not a credit-and-refund VAT, so it sticks.
    recoverable: entry.label !== "SST",
    note: entry.note,
  };
}

/** Why a country has no VAT line — distinguishes "none" from "unknown". */
export function vatAbsenceReason(iso3: string): string {
  const iso = iso3.trim().toUpperCase();
  const entry = VAT_RATES[iso];
  if (!entry) return `We hold no VAT rate for ${iso}; it has not been excluded, only not recorded.`;
  if (entry.standardRatePct === null) {
    return entry.note ?? `${iso} levies no import VAT.`;
  }
  return "";
}

/** Countries we hold a rate for — used by diagnostics and tests. */
export function vatCoverage(): number {
  return Object.values(VAT_RATES).filter((v) => v.standardRatePct !== null).length;
}
