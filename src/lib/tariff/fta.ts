/**
 * India's trade agreements — eligibility, not rates.
 *
 * WHY THIS IS NOT A RATE TABLE
 * Phase 4 was scoped to return preferential tariff rates. It cannot be built
 * from any source we can reach:
 *
 *   - WITS TRAINS serves no preferential lines through its SDMX endpoint. We
 *     tested USA<-Mexico under USMCA, which would certainly carry data if the
 *     endpoint served preferential rates at all, and both `reported` and
 *     `aveestimated` datatypes. Every partner-specific query returns nothing.
 *   - India's own CEPA schedules are published as annexes to each agreement.
 *     The commerce.gov.in links are dead and the UAE ministry copy is blocked.
 *
 * Guessing a preferential rate would be the worst thing this codebase could
 * ship. So this module answers the question one step back — "does an agreement
 * cover this destination, and how do I claim it?" — which is true, useful, and
 * verifiable.
 *
 * The practical value is that it changes the advice. "The UAE charges 5%" tells
 * a manufacturer their goods are 5% more expensive. "The UAE charges 5% MFN,
 * but CEPA has been in force since May 2022 and your buyer may pay less with a
 * Certificate of Origin" tells them to go and find out — which is the correct
 * next action, and one no competitor surfaces.
 *
 * STATUS MATTERS. Only an agreement IN FORCE gives a claimable rate. Signed and
 * announced agreements do not, and conflating them would send a manufacturer to
 * claim a preference that does not yet exist.
 */

export type FtaStatus = "in-force" | "signed" | "announced";

export interface TradeAgreement {
  /** Short name as the trade press and DGFT use it. */
  name: string;
  /** Only "in-force" agreements can actually be claimed against. */
  status: FtaStatus;
  /** When it entered into force, where that has happened. */
  inForceSince?: string;
  /** Anything a manufacturer needs to know before relying on it. */
  note?: string;
}

/**
 * Keyed to the same ISO-3 codes as WITS_REPORTERS and VAT_RATES.
 *
 * Only destinations we can already price are listed — an agreement with a
 * country we hold no duty for would have nothing to attach to.
 */
export const AGREEMENTS: Record<string, TradeAgreement> = {
  ARE: {
    name: "India–UAE CEPA",
    status: "in-force",
    inForceSince: "2022-05-01",
    note: "Broad tariff elimination on Indian goods; the flagship corridor for Indian MSME exports.",
  },
  JPN: {
    name: "India–Japan CEPA",
    status: "in-force",
    inForceSince: "2011-08-01",
  },
  KOR: {
    name: "India–Korea CEPA",
    status: "in-force",
    inForceSince: "2010-01-01",
  },
  SGP: {
    name: "India–Singapore CECA (and ASEAN–India AITIGA)",
    status: "in-force",
    inForceSince: "2005-08-01",
    note: "Singapore's MFN duties are already zero on most goods, so a preference often changes nothing.",
  },
  MYS: {
    name: "India–Malaysia CECA (and ASEAN–India AITIGA)",
    status: "in-force",
    inForceSince: "2011-07-01",
  },
  THA: {
    name: "ASEAN–India AITIGA",
    status: "in-force",
    inForceSince: "2010-01-01",
  },
  IDN: {
    name: "ASEAN–India AITIGA",
    status: "in-force",
    inForceSince: "2010-01-01",
  },
  VNM: {
    name: "ASEAN–India AITIGA",
    status: "in-force",
    inForceSince: "2010-01-01",
  },
  GBR: {
    name: "India–UK CETA",
    status: "in-force",
    inForceSince: "2026-07-15",
    note: "Very recent — in force since July 2026, covering duty-free or preferential access for the large majority of Indian exports. Confirm implementation for your specific line, as customs procedures are still bedding in.",
  },
  CHL: {
    name: "India–Chile PTA",
    status: "in-force",
    note: "A preferential trade agreement covering a limited list of products, not a comprehensive FTA — check whether your line is on the schedule.",
  },
};

/** How a preference is actually claimed. Same mechanism across agreements. */
export const CLAIM_PROCESS =
  "A preferential rate is not automatic. The exporter must obtain a Certificate " +
  "of Origin under the relevant agreement — applied for through DGFT's Common " +
  "Digital Platform for CoO — and the buyer presents it at import. Without it the " +
  "MFN rate applies.";

export interface FtaLookup {
  agreement: TradeAgreement;
  /** True only when the agreement is in force and can be claimed today. */
  claimable: boolean;
}

/** The agreement covering a destination, if any. */
export function agreementFor(iso3: string): FtaLookup | null {
  const entry = AGREEMENTS[iso3.trim().toUpperCase()];
  if (!entry) return null;
  return { agreement: entry, claimable: entry.status === "in-force" };
}

/**
 * The sentence to attach to an MFN rate.
 *
 * Deliberately never states or implies a preferential percentage — we do not
 * hold one, and an invented number here would be worse than silence.
 */
export function describeAgreement(
  lookup: FtaLookup,
  /** The MFN rate the agreement sits against, so the wording stays truthful. */
  mfnRatePct?: number
): string {
  const a = lookup.agreement;

  if (!lookup.claimable) {
    return (
      `${a.name} has been ${a.status} but is not yet in force, so the MFN rate still applies. ` +
      (a.note ? `${a.note} ` : "")
    );
  }

  const inForce = `${a.name} is in force${a.inForceSince ? ` (since ${a.inForceSince})` : ""}`;

  // Claiming the duty is "likely higher than they will pay" is false when MFN
  // is already zero — there is nothing for a preference to reduce.
  if (mfnRatePct === 0) {
    return (
      `${inForce}, but the MFN rate here is already 0%, so a preference changes nothing ` +
      `for this product. ` + (a.note ? `${a.note} ` : "")
    );
  }

  return (
    `${inForce}, so the duty above is likely HIGHER than what your buyer will actually pay. ` +
    (a.note ? `${a.note} ` : "") +
    `We do not hold the preferential rate for this product — you MUST say that plainly ` +
    `rather than estimating it, and tell the user to confirm the CEPA/FTA rate for their ` +
    `tariff line with the buyer's customs broker. ${CLAIM_PROCESS}`
  );
}

/** Destinations covered by an agreement — used by diagnostics and tests. */
export function agreementCoverage(): number {
  return Object.keys(AGREEMENTS).length;
}
