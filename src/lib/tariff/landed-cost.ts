/**
 * Landed cost for the buyer, and net realisation for the exporter.
 *
 * Everything built in Phases 1 and 2 exists to answer two questions a
 * manufacturer asks when deciding whether a shipment is worth making:
 *
 *   "What will it cost my buyer to land this?"   -> are we price-competitive?
 *   "What do I actually take home?"              -> is it worth doing?
 *
 * The first needs the destination's import duty; the second needs RoDTEP and
 * Duty Drawback coming back the other way. Competitors answer neither, and the
 * ones that show a duty show India's — which is what an importer pays, not an
 * exporter.
 *
 * WHAT THIS IS AND IS NOT
 * It is an estimate built from inputs the user supplies. It is not a quote, not
 * a customs valuation, and not a substitute for a broker. Every caveat that
 * materially changes the number is returned with the number rather than buried:
 * MFN vs preferential, the duty basis, an unapplied RoDTEP cap, destination
 * VAT, and local charges we do not model.
 */

import { destinationDuty, type DestinationDuty } from "./destination";
import { assessVat, vatAbsenceReason, VAT_SOURCE, type VatAssessment } from "./vat";
import { agreementFor, type FtaStatus } from "./fta";
import { surchargeFor, describeSurcharge, type SurchargeKind } from "./surcharge";
import { lookupRodtep } from "@/lib/hs/rodtep";
import { drawbackForHsCode } from "@/lib/hs/drawback";

/**
 * Whether a country assesses duty on CIF or on FOB.
 *
 * Most of the world charges duty on CIF — goods plus freight plus insurance.
 * The United States and Canada assess on transaction value, which for a normal
 * export excludes international freight and insurance, so charging duty on CIF
 * would overstate their duty by several percent of freight. Only countries we
 * are confident about are listed; everything else defaults to CIF, and the
 * result says which basis was used.
 */
const FOB_BASIS_COUNTRIES = new Set(["USA", "CAN"]);

/**
 * Which value a destination charges duty on.
 *
 * Exported so it can be asserted without a network call — the basis is the
 * quietest way this calculation can go wrong. Charging Germany's rate on FOB,
 * or America's on CIF, produces a plausible number that is simply incorrect.
 */
export function dutyBasisFor(iso3: string): "CIF" | "FOB" {
  return FOB_BASIS_COUNTRIES.has(iso3.trim().toUpperCase()) ? "FOB" : "CIF";
}

export interface LandedCostArgs {
  /** 6-digit HS code, from classifyProduct. */
  hsCode: string;
  /** ISO-3 of the destination, e.g. "DEU". */
  destinationIso: string;
  /** Invoice value of the goods, ex-works/FOB, in INR. */
  fobInr: number;
  /** International freight in INR. Optional; omitted means CIF cannot be formed. */
  freightInr?: number;
  /** Marine insurance in INR. Optional. */
  insuranceInr?: number;
  /**
   * Units shipped. Only needed to apply RoDTEP's per-unit cap — without it the
   * rebate is computed uncapped and flagged as possibly overstated.
   */
  quantity?: number;
  /** 8-digit ITC-HS line, if known — gives a precise RoDTEP rate. */
  itcCode?: string;
}

export interface LandedCostBreakdown {
  /** What the buyer pays to get the goods to their door, before local taxes. */
  buyer: {
    fobInr: number;
    freightInr: number;
    insuranceInr: number;
    cifInr: number;
    /** The value duty was charged on — CIF or FOB, per the destination. */
    dutyBasis: "CIF" | "FOB";
    dutyBasisValueInr: number;
    dutyRatePct: number;
    dutyInr: number;
    /**
     * CIF plus duty. This is the competitiveness number for a B2B sale, because
     * a VAT-registered buyer reclaims the VAT below.
     */
    landedCostInr: number;
    /** Landed cost as a multiple of the invoice — the competitiveness number. */
    upliftPct: number;
    /** Import VAT/GST, or null where the destination levies none. */
    vat: VatAssessment | null;
    /** What the buyer actually fronts at the border, VAT included. */
    cashAtBorderInr: number;
  };
  /** What comes back to the exporter. */
  exporter: {
    fobInr: number;
    rodtepInr: number | null;
    rodtepRatePct: number | null;
    /** True when the per-unit cap could not be applied for want of a quantity. */
    rodtepCapUnapplied: boolean;
    drawbackInr: number | null;
    drawbackRatePct: number | null;
    /** Set when the drawback heading holds several rates and we refused to pick. */
    drawbackAmbiguous: boolean;
    netRealisationInr: number;
  };
  destination: DestinationDuty;
  /**
   * The trade agreement covering this destination, if any — see fta.ts. Never
   * carries a preferential rate (none is verifiable), only whether one exists,
   * whether it can be claimed today, and since when.
   */
  fta: {
    name: string;
    status: FtaStatus;
    claimable: boolean;
    inForceSince?: string;
    note?: string;
  } | null;
  /**
   * A measure pushing the buyer's cost ABOVE the MFN rate — see surcharge.ts.
   * The mirror of `fta`: that field warns the duty may be too high, this one
   * warns it is too low. Like `fta` it carries no per-line rate, because scope
   * is defined below the granularity we can verify.
   */
  surcharge: {
    name: string;
    kind: SurchargeKind;
    headlineRatePct: number | null;
    since: string;
    coversProduct: boolean;
    source: string;
  } | null;
  /** Every caveat that materially moves these numbers. */
  caveats: string[];
}

export type LandedCostResult =
  | {
      ok: true;
      data: LandedCostBreakdown;
      narrative: string;
      /** True when the destination duty came from cache; the arithmetic is always fresh. */
      cached: boolean;
    }
  | { ok: false; error: string; narrative: string };

const inr = (n: number) => Math.round(n * 100) / 100;

export async function landedCost(
  args: LandedCostArgs
): Promise<LandedCostResult> {
  const fob = Number(args?.fobInr);
  if (!Number.isFinite(fob) || fob <= 0) {
    return {
      ok: false,
      error: "Invalid FOB value.",
      narrative:
        "I need the invoice value of the goods in rupees before I can work out a landed cost.",
    };
  }

  const duty = await destinationDuty({
    destinationIso: args.destinationIso,
    hsCode: args.hsCode,
  });
  if (!duty.ok) {
    // Propagate the refusal rather than substituting a rate. The destination
    // module already phrases this as a TOOL_ERROR the model must not paper over.
    return duty;
  }

  const data = composeLandedCost(args, duty.data);
  return { ok: true, data, narrative: describe(data), cached: duty.cached };
}

/**
 * The arithmetic, with the duty rate handed in rather than fetched.
 *
 * Separated from landedCost() so the money can be tested. Every number a
 * manufacturer would price a shipment on is decided in here — which value duty
 * is charged on, whether VAT compounds on the duty, whether a RoDTEP cap was
 * applied — and none of it was assertable while it sat behind a WITS call that
 * needs a network and a Supabase cache to reach.
 *
 * Callers must validate `fobInr` first; this function assumes it is a positive
 * finite number, which landedCost() has already checked by the time it calls.
 */
export function composeLandedCost(
  args: LandedCostArgs,
  destination: DestinationDuty
): LandedCostBreakdown {
  const fob = Number(args.fobInr);
  const caveats: string[] = [];

  const freight = Number(args?.freightInr);
  const insurance = Number(args?.insuranceInr);
  const hasFreight = Number.isFinite(freight) && freight >= 0;
  const hasInsurance = Number.isFinite(insurance) && insurance >= 0;

  const freightVal = hasFreight ? freight : 0;
  const insuranceVal = hasInsurance ? insurance : 0;
  const cif = fob + freightVal + insuranceVal;

  if (!hasFreight) {
    caveats.push(
      "No freight cost supplied, so this is not a true CIF landed cost — the real figure will be higher."
    );
  }
  if (!hasInsurance) {
    caveats.push("No marine insurance cost supplied.");
  }

  // ── Buyer side ─────────────────────────────────────────────────────────────
  const iso = args.destinationIso.trim().toUpperCase();
  const dutyBasis = dutyBasisFor(iso);
  const dutyBase = dutyBasis === "FOB" ? fob : cif;
  const dutyAmount = (dutyBase * destination.mfnRatePct) / 100;
  const landed = cif + dutyAmount;

  // A destination priced from a treaty is not quoting MFN, and saying it is
  // would be a plain falsehood about the number directly above it.
  const treatyPriced = destination.rateBasis === "treaty-zero";

  if (treatyPriced) {
    caveats.push(
      `Duty is ${destination.mfnRatePct}% under ${destination.rateSource ?? "a trade agreement"}, ` +
        `which is a treaty rate and not ${destination.country}'s MFN rate. It applies only to ` +
        `goods proved to be of Indian origin — without a Certificate of Origin your buyer pays ` +
        `the MFN rate instead, which we do not hold.`
    );
  } else {
    caveats.push(
      `Duty is the MFN rate (${destination.mfnRatePct}%, reported ${destination.year}).`
    );
  }
  caveats.push(
    `Duty calculated on ${dutyBasis}, which is how ${destination.country} assesses it.`
  );

  // Named agreement or an explicit "none" — never the vague "may be lower"
  // this caveat used to carry, which said nothing a manufacturer could act on.
  const ftaLookup = agreementFor(iso);
  const fta: LandedCostBreakdown["fta"] = ftaLookup
    ? {
        name: ftaLookup.agreement.name,
        status: ftaLookup.agreement.status,
        claimable: ftaLookup.claimable,
        inForceSince: ftaLookup.agreement.inForceSince,
        note: ftaLookup.agreement.note,
      }
    : null;

  if (treatyPriced) {
    // The duty above already IS this agreement's rate. The generic branch below
    // says it "likely overstates what your buyer actually pays" and that "we do
    // not hold the preferential rate" — both false here, and both contradicting
    // the number we just printed. What is left to warn about is the condition.
    caveats.push(
      `${fta?.name ?? "The agreement"} is already applied in the duty above, so there is no ` +
        `further preference to claim. What there is to do is prove origin: apply for a ` +
        `Certificate of Origin through DGFT's Common Digital Platform for CoO, without which ` +
        `the MFN rate applies instead.${fta?.note ? ` ${fta.note}` : ""}`
    );
  } else if (fta?.claimable) {
    caveats.push(
      `${fta.name} is in force${fta.inForceSince ? ` (since ${fta.inForceSince})` : ""}, ` +
        "so the duty above likely overstates what your buyer actually pays. We do not hold the " +
        "preferential rate for this product — confirm it with a customs broker. Claiming it needs " +
        "a Certificate of Origin, applied for through DGFT's Common Digital Platform for CoO; " +
        `without it the MFN rate applies. ${fta.note ?? ""}`.trim()
    );
  } else if (fta) {
    caveats.push(
      `${fta.name} has been ${fta.status} but is not yet in force, so the MFN duty above still applies.`
    );
  } else {
    caveats.push(
      "We hold no trade agreement covering this destination for Indian goods, so the MFN rate is " +
        "most likely what applies."
    );
  }
  // The other direction. An MFN rate is only the whole story where nothing
  // sits on top of it, and since 2025 that is no longer true of the largest
  // destination for Indian goods.
  const surchargeLookup = surchargeFor(iso, args.hsCode);
  const surcharge: LandedCostBreakdown["surcharge"] = surchargeLookup
    ? {
        name: surchargeLookup.measure.name,
        kind: surchargeLookup.measure.kind,
        headlineRatePct: surchargeLookup.measure.headlineRatePct,
        since: surchargeLookup.measure.since,
        coversProduct: surchargeLookup.coversProduct,
        source: surchargeLookup.measure.source,
      }
    : null;

  if (surchargeLookup) {
    // Unshifted, not pushed: a measure that makes the headline number wrong
    // has to be read before the caveats about freight and rounding.
    caveats.unshift(describeSurcharge(surchargeLookup));
  }

  // VAT is charged on CIF plus duty — it compounds on the duty rather than
  // sitting beside it.
  const vat = assessVat(iso, landed);
  if (vat) {
    caveats.push(
      `${vat.label} of ${vat.ratePct}% applies on top, charged on CIF plus duty, ` +
        `not on the goods alone. ` +
        (vat.recoverable
          ? "A VAT-registered business buyer normally reclaims this as input tax credit, so it is " +
            "a cash-flow cost rather than a cost of goods — do NOT treat it as making the price " +
            "uncompetitive."
          : "This is a sales tax rather than a credit-and-refund VAT, so the buyer cannot reclaim it.") +
        ` Standard rate only; many countries apply a reduced rate to specific goods. ` +
        `Source: ${VAT_SOURCE}.`
    );
    if (vat.note) caveats.push(vat.note);
  } else {
    const reason = vatAbsenceReason(iso);
    if (reason) caveats.push(reason);
  }

  caveats.push(
    "Excludes port, customs-clearance, demurrage and inland delivery charges at the destination."
  );

  // ── Exporter side ──────────────────────────────────────────────────────────
  let rodtepInr: number | null = null;
  let rodtepRatePct: number | null = null;
  let rodtepCapUnapplied = false;

  const itc = String(args?.itcCode ?? "").replace(/\D/g, "");
  const rate = itc.length === 8 ? lookupRodtep(itc) : null;

  if (rate) {
    rodtepRatePct = rate.notifiedRatePct;
    const uncapped = (fob * rate.notifiedRatePct) / 100;
    const qty = Number(args?.quantity);

    if (rate.capPerUnitInr !== null) {
      if (Number.isFinite(qty) && qty > 0) {
        rodtepInr = Math.min(uncapped, rate.capPerUnitInr * qty);
      } else {
        rodtepInr = uncapped;
        rodtepCapUnapplied = true;
        caveats.push(
          `RoDTEP on this line is capped at Rs ${rate.capPerUnitInr} per ${rate.unit || "unit"}. ` +
            "Without a quantity the cap could not be applied, so the rebate shown may be too high."
        );
      }
    } else {
      rodtepInr = uncapped;
    }

    caveats.push(
      "RoDTEP shown is the NOTIFIED rate. DGFT currently limits benefits to 50% of notified " +
        "rates and value caps — confirm whether that limitation still applies before relying on it."
    );
  } else if (itc.length === 8) {
    caveats.push(`No RoDTEP rate is scheduled for tariff line ${itc}.`);
  } else {
    caveats.push(
      "No 8-digit tariff line supplied, so RoDTEP could not be calculated. Call " +
        "getIndianTariffLines to resolve it."
    );
  }

  let drawbackInr: number | null = null;
  let drawbackRatePct: number | null = null;
  let drawbackAmbiguous = false;

  const dbk = drawbackForHsCode(args.hsCode);
  if (dbk) {
    if (dbk.unambiguous) {
      drawbackRatePct = dbk.items[0].ratePct;
      drawbackInr = (fob * drawbackRatePct) / 100;
    } else {
      // The drawback schedule subdivides differently from ITC-HS. Picking one
      // rate here would invent a mapping that does not exist.
      drawbackAmbiguous = true;
      const rates = dbk.items.map((i) => i.ratePct);
      caveats.push(
        `Duty Drawback for heading ${dbk.heading} spans ${Math.min(...rates)}%-${Math.max(...rates)}% ` +
          "across several drawback items, which do not map one-to-one to ITC-HS lines. " +
          "It is excluded from this calculation — a customs broker must confirm which item applies."
      );
    }
  }

  const netRealisation = fob + (rodtepInr ?? 0) + (drawbackInr ?? 0);

  return {
    buyer: {
      fobInr: inr(fob),
      freightInr: inr(freightVal),
      insuranceInr: inr(insuranceVal),
      cifInr: inr(cif),
      dutyBasis,
      dutyBasisValueInr: inr(dutyBase),
      dutyRatePct: destination.mfnRatePct,
      dutyInr: inr(dutyAmount),
      landedCostInr: inr(landed),
      upliftPct: inr(((landed - fob) / fob) * 100),
      vat,
      cashAtBorderInr: inr(landed + (vat?.amountInr ?? 0)),
    },
    exporter: {
      fobInr: inr(fob),
      rodtepInr: rodtepInr === null ? null : inr(rodtepInr),
      rodtepRatePct,
      rodtepCapUnapplied,
      drawbackInr: drawbackInr === null ? null : inr(drawbackInr),
      drawbackRatePct,
      drawbackAmbiguous,
      netRealisationInr: inr(netRealisation),
    },
    destination,
    fta,
    surcharge,
    caveats,
  };
}

function money(n: number): string {
  return `Rs ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function describe(d: LandedCostBreakdown): string {
  const b = d.buyer;
  const e = d.exporter;

  let s =
    `Landed cost for the buyer in ${d.destination.country}: ${money(b.landedCostInr)} ` +
    `on goods invoiced at ${money(b.fobInr)} — that is ${b.upliftPct}% above invoice. ` +
    `Made up of ${money(b.fobInr)} goods + ${money(b.freightInr)} freight + ` +
    `${money(b.insuranceInr)} insurance + ${money(b.dutyInr)} duty ` +
    `(${b.dutyRatePct}% on ${b.dutyBasis} of ${money(b.dutyBasisValueInr)}). `;

  if (b.vat) {
    // Deliberately reported as cash at the border, separate from landed cost.
    // Folding recoverable VAT into a price comparison makes a competitive quote
    // look uncompetitive.
    s +=
      `${b.vat.label} of ${b.vat.ratePct}% on ${money(b.vat.baseInr)} adds ` +
      `${money(b.vat.amountInr)}, so the buyer fronts ${money(b.cashAtBorderInr)} at the border` +
      (b.vat.recoverable
        ? ` — but reclaims the ${b.vat.label} if VAT-registered, so their real cost stays ` +
          `${money(b.landedCostInr)}. `
        : `, and cannot reclaim it. `);
  }

  s += `For the exporter: `;
  if (e.rodtepInr !== null) {
    s += `RoDTEP ${money(e.rodtepInr)} at ${e.rodtepRatePct}%`;
  } else {
    s += `no RoDTEP calculated`;
  }
  if (e.drawbackInr !== null) {
    s += `, Duty Drawback ${money(e.drawbackInr)} at ${e.drawbackRatePct}%`;
  } else if (e.drawbackAmbiguous) {
    s += `, Duty Drawback excluded (several rates apply to this heading)`;
  }
  s += `, giving a net realisation of ${money(e.netRealisationInr)}. `;

  s +=
    `MANDATORY: present this as an ESTIMATE, never a quote. You MUST state these caveats: ` +
    d.caveats.map((c) => `(${c})`).join(" ") +
    ` Tell the user the figures depend on the freight and insurance they supplied, and that ` +
    `their buyer's customs broker should confirm the duty for the actual shipment.`;

  return s;
}
