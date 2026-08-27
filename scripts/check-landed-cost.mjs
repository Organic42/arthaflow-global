/**
 * Checks the landed-cost arithmetic — the numbers a manufacturer prices on.
 *
 *     npm run test:landed-cost
 *
 * This is the most consequential calculation in the product and it was the
 * least tested. Everything else we pin is a lookup: get it wrong and a user
 * sees a wrong fact. Get this wrong and someone quotes a real shipment at a
 * price that loses them money, and nothing about the output looks unusual.
 *
 * The failure we already survived once — a silent 13% shortfall in the DGCIS
 * import that passed a loose plausibility band — is the argument for pinning
 * exact values here rather than asserting numbers are "roughly right". Every
 * expected figure below is computed by hand in the comment above it.
 *
 * composeLandedCost() takes the duty rate as an argument instead of fetching
 * it, so none of this needs a network or the Supabase cache.
 */
import { composeLandedCost, describe, dutyBasisFor } from "../src/lib/tariff/landed-cost.ts";
import {
  WITS_REPORTERS,
  supportedDestinations,
  treatyPricedDestinations,
  isTreatyPriced,
} from "../src/lib/tariff/destination.ts";
import { AGREEMENTS } from "../src/lib/tariff/fta.ts";
import { surchargeFor, MEASURES } from "../src/lib/tariff/surcharge.ts";

let passed = 0;
let failed = 0;

function check(label, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`PASS  ${label}`);
  } else {
    failed++;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Money comparison, tolerant of the half-paisa rounding in inr(). */
const near = (a, b) => Math.abs(a - b) < 0.02;

/** A duty result shaped like the one destinationDuty() returns. */
function dest(iso3, country, hsCode, mfnRatePct, year = 2024) {
  return {
    iso3,
    country,
    hsCode,
    mfnRatePct,
    minRatePct: null,
    maxRatePct: null,
    year,
    lineCount: null,
  };
}

const FOB = 1_000_000;
const FREIGHT = 80_000;
const INSURANCE = 12_000;
const CIF = 1_092_000; // 1,000,000 + 80,000 + 12,000

// ── Which value duty is charged on ──────────────────────────────────────────
// Called out in landed-cost.ts as "the quietest way this calculation can go
// wrong": charging Germany's rate on FOB, or America's on CIF, produces a
// number that is plausible and simply incorrect.
check("the United States assesses on FOB", dutyBasisFor("USA") === "FOB");
check("Canada assesses on FOB", dutyBasisFor("CAN") === "FOB");
check("Germany assesses on CIF", dutyBasisFor("DEU") === "CIF");
check("an unlisted country defaults to CIF", dutyBasisFor("BRA") === "CIF");
check("the basis lookup is case-insensitive", dutyBasisFor("usa") === "FOB");

// ── Germany: the full buyer chain on CIF ────────────────────────────────────
// cif      = 1,000,000 + 80,000 + 12,000 = 1,092,000
// duty     = 1,092,000 x 6.5%            =    70,980
// landed   = 1,092,000 + 70,980          = 1,162,980
// uplift   = 162,980 / 1,000,000         =     16.3%
// VAT 19%  = 1,162,980 x 19%             =   220,966.20
// at border= 1,162,980 + 220,966.20      = 1,383,946.20
const de = composeLandedCost(
  {
    hsCode: "520100",
    destinationIso: "DEU",
    fobInr: FOB,
    freightInr: FREIGHT,
    insuranceInr: INSURANCE,
  },
  dest("DEU", "Germany", "520100", 6.5)
);

check("CIF is goods plus freight plus insurance", de.buyer.cifInr === CIF, `${de.buyer.cifInr}`);
check("duty is charged on CIF for Germany", de.buyer.dutyBasisValueInr === CIF);
check("duty is 70,980", near(de.buyer.dutyInr, 70_980), `${de.buyer.dutyInr}`);
check("landed cost is CIF plus duty", near(de.buyer.landedCostInr, 1_162_980), `${de.buyer.landedCostInr}`);
check("uplift is 16.3% over invoice", near(de.buyer.upliftPct, 16.3), `${de.buyer.upliftPct}`);

// ── VAT compounds on the duty; it does not sit beside it ────────────────────
// Getting this wrong understates VAT by the VAT rate applied to the duty —
// here 19% of 70,980, or 13,486, which no one would notice was missing.
check("VAT is charged on CIF plus duty, not on CIF", near(de.buyer.vat.baseInr, 1_162_980), `${de.buyer.vat?.baseInr}`);
check("German VAT is 19%", de.buyer.vat.ratePct === 19);
check("VAT is 220,966.20", near(de.buyer.vat.amountInr, 220_966.2), `${de.buyer.vat.amountInr}`);
check("German VAT is reclaimable by a registered buyer", de.buyer.vat.recoverable === true);

// Landed cost and cash-at-border are deliberately different numbers. Folding
// recoverable VAT into a price comparison makes a competitive quote look
// uncompetitive, so the comparison number must stay VAT-free.
check("cash at border adds VAT to landed cost", near(de.buyer.cashAtBorderInr, 1_383_946.2), `${de.buyer.cashAtBorderInr}`);
check(
  "landed cost stays free of recoverable VAT",
  de.buyer.landedCostInr < de.buyer.cashAtBorderInr && near(de.buyer.landedCostInr, 1_162_980)
);

// ── The United States: FOB basis, and no import VAT ─────────────────────────
// duty on FOB = 1,000,000 x 8% = 80,000
// duty on CIF would be 1,092,000 x 8% = 87,360, so the basis is worth 7,360 —
// exactly 8% of the 92,000 of freight and insurance.
const us = composeLandedCost(
  {
    hsCode: "520100",
    destinationIso: "USA",
    fobInr: FOB,
    freightInr: FREIGHT,
    insuranceInr: INSURANCE,
  },
  dest("USA", "United States", "520100", 8)
);

check("duty is charged on FOB for the US", us.buyer.dutyBasisValueInr === FOB);
check("US duty is 80,000, not 87,360", near(us.buyer.dutyInr, 80_000), `${us.buyer.dutyInr}`);
check(
  "the basis is worth exactly the rate applied to freight and insurance",
  near(1_092_000 * 0.08 - us.buyer.dutyInr, (FREIGHT + INSURANCE) * 0.08)
);
check("landed cost still includes freight and insurance", near(us.buyer.landedCostInr, 1_172_000), `${us.buyer.landedCostInr}`);
check("the US levies no import VAT", us.buyer.vat === null);
check("cash at border equals landed cost where there is no VAT", near(us.buyer.cashAtBorderInr, us.buyer.landedCostInr));

// ── A surcharge is disclosed, and quantified as a conditional figure ────────
// The quoted duty stays MFN-only: it is the number we can verify without
// qualification. What changed is that the measure is no longer left as prose —
// omitting the arithmetic is not neutral when the exporter quotes from the
// screen, so the corrected total is computed alongside and labelled.
check("the US measure is attached", us.surcharge?.headlineRatePct === 18);
check("the US measure is in scope for this product", us.surcharge?.coversProduct === true);
check("the quoted duty stays MFN-only", near(us.buyer.dutyInr, 80_000));
// 1,000,000 FOB x 18% = 180,000 on top of the 80,000 MFN duty.
check(
  "the conditional duty adds 18% of customs value",
  near(us.surcharge.ifAppliedDutyInr, 260_000),
  `${us.surcharge?.ifAppliedDutyInr}`
);
check(
  "and the conditional landed cost is 1,352,000",
  near(us.surcharge.ifAppliedLandedCostInr, 1_352_000),
  `${us.surcharge?.ifAppliedLandedCostInr}`
);
// Charged on the same value the duty is, not compounded on the duty-paid
// figure the way import VAT is. 18% of 1,092,000 would be 196,560.
check(
  "the surcharge is charged on customs value, not on CIF-plus-duty",
  near(us.surcharge.ifAppliedLandedCostInr - us.buyer.landedCostInr, 180_000)
);
check(
  "the surcharge caveat is read first, ahead of freight and rounding",
  /reciprocal|18%/.test(us.caveats[0] ?? ""),
  `first caveat: ${(us.caveats[0] ?? "").slice(0, 60)}`
);

// ── CBAM applies by chapter, not to everything the EU imports ───────────────
const deSteel = composeLandedCost(
  { hsCode: "730890", destinationIso: "DEU", fobInr: FOB },
  dest("DEU", "Germany", "730890", 2)
);
check("CBAM covers chapter 73 steel", deSteel.surcharge?.coversProduct === true);
check("CBAM does not cover chapter 52 cotton", de.surcharge?.coversProduct === false);
check("CBAM carries no percentage rate", deSteel.surcharge?.headlineRatePct === null);

// ── RoDTEP: the per-unit cap ────────────────────────────────────────────────
// 52051110 is notified at 3.4% with a cap of Rs 10/Kg.
// uncapped on 1,000,000 = 34,000
//   2,000 Kg -> cap 20,000, so the cap binds
//  10,000 Kg -> cap 100,000, so the notified rate binds
const capBinds = composeLandedCost(
  { hsCode: "520100", destinationIso: "DEU", fobInr: FOB, itcCode: "52051110", quantity: 2_000 },
  dest("DEU", "Germany", "520100", 6.5)
);
const rateBinds = composeLandedCost(
  { hsCode: "520100", destinationIso: "DEU", fobInr: FOB, itcCode: "52051110", quantity: 10_000 },
  dest("DEU", "Germany", "520100", 6.5)
);
const noQty = composeLandedCost(
  { hsCode: "520100", destinationIso: "DEU", fobInr: FOB, itcCode: "52051110" },
  dest("DEU", "Germany", "520100", 6.5)
);

check("the notified RoDTEP rate is read from the schedule", capBinds.exporter.rodtepRatePct === 3.4);
check("the per-unit cap binds at 2,000 Kg", near(capBinds.exporter.rodtepInr, 20_000), `${capBinds.exporter.rodtepInr}`);
check("the notified rate binds at 10,000 Kg", near(rateBinds.exporter.rodtepInr, 34_000), `${rateBinds.exporter.rodtepInr}`);
check("a bound cap is not flagged as unapplied", capBinds.exporter.rodtepCapUnapplied === false);
// Without a quantity the cap cannot be applied. Showing the uncapped figure
// silently would overstate the rebate by 14,000 on this shipment.
check("no quantity leaves the cap unapplied", noQty.exporter.rodtepCapUnapplied === true);
check("and says so in the caveats", noQty.caveats.some((c) => /cap could not be applied/i.test(c)));

// ── Duty Drawback: applied when unambiguous, refused when not ───────────────
// Heading 5201 carries a single rate (0.5%); heading 6302 spans 1.5%-3.5%
// across drawback items that do not map one-to-one onto ITC-HS lines.
check("an unambiguous drawback rate is applied", de.exporter.drawbackRatePct === 0.5);
check("drawback is 5,000 on a 1,000,000 invoice", near(de.exporter.drawbackInr, 5_000), `${de.exporter.drawbackInr}`);

const ambiguous = composeLandedCost(
  { hsCode: "630231", destinationIso: "DEU", fobInr: FOB },
  dest("DEU", "Germany", "630231", 6.5)
);
check("an ambiguous drawback heading is flagged", ambiguous.exporter.drawbackAmbiguous === true);
check("and contributes nothing to the total", ambiguous.exporter.drawbackInr === null);
check(
  "and explains the span rather than picking a rate",
  ambiguous.caveats.some((c) => /1.5%-3.5%/.test(c))
);

// ── Net realisation ─────────────────────────────────────────────────────────
// 1,000,000 invoice + 20,000 RoDTEP + 5,000 drawback = 1,025,000
check(
  "net realisation is invoice plus RoDTEP plus drawback",
  near(capBinds.exporter.netRealisationInr, 1_025_000),
  `${capBinds.exporter.netRealisationInr}`
);
check(
  "a refused drawback is excluded from net realisation rather than guessed",
  near(ambiguous.exporter.netRealisationInr, FOB)
);

// ── Missing inputs degrade honestly instead of quietly ──────────────────────
const bare = composeLandedCost(
  { hsCode: "520100", destinationIso: "DEU", fobInr: FOB },
  dest("DEU", "Germany", "520100", 6.5)
);
check("without freight, CIF collapses to the invoice", bare.buyer.cifInr === FOB);
check(
  "and the result says it is not a true CIF landed cost",
  bare.caveats.some((c) => /not a true CIF/i.test(c))
);

// ── Trade agreements ────────────────────────────────────────────────────────
// Every agreement must attach to a destination we can actually price; an
// entry for a country with no duty lookup would never be reached.
const priceable = new Set(supportedDestinations());
const orphans = Object.keys(AGREEMENTS).filter((iso) => !priceable.has(iso));
check("no agreement names a destination we cannot price", orphans.length === 0, orphans.join(", "));

// Added after finding that five priced destinations with in-force Indian
// agreements were emitting "we hold no trade agreement covering this
// destination" — an affirmative claim, and a wrong one.
for (const iso of ["LKA", "NPL", "MDV", "PHL", "NOR"]) {
  check(`${iso} carries its in-force agreement`, AGREEMENTS[iso]?.status === "in-force");
}
check("India–EFTA TEPA is dated from October 2025", AGREEMENTS.NOR?.inForceSince === "2025-10-01");

const claimable = composeLandedCost(
  { hsCode: "520100", destinationIso: "ARE", fobInr: FOB },
  dest("ARE", "United Arab Emirates", "520100", 5)
);
check("a claimable agreement is named", claimable.fta?.name === "India–UAE CEPA");
check("and is marked claimable", claimable.fta?.claimable === true);
check(
  "and the caveat points at the Certificate of Origin",
  claimable.caveats.some((c) => /Certificate of Origin/i.test(c))
);

// ── Australia, priced from a treaty rather than a tariff lookup ─────────────
// TRAINS holds nothing for Australia, but ECTA's final phase put every
// Australian tariff line at zero for Indian-origin goods on 1 January 2026 —
// so the rate is known, and better known than any MFN average would be.
const AUS_DUTY = {
  iso3: "AUS",
  country: "Australia",
  hsCode: "610910",
  mfnRatePct: 0,
  minRatePct: 0,
  maxRatePct: 0,
  year: 2026,
  lineCount: null,
  rateBasis: "treaty-zero",
  rateSource: "India-Australia ECTA, final tariff phase from 1 January 2026",
};

check("Australia is priceable", supportedDestinations().includes("AUS"));
check("Australia is priced from a treaty, not TRAINS", treatyPricedDestinations().includes("AUS"));

// A REGRESSION GUARD, not a formality. TRAINS rejects Australia's reporter
// code 36, and the neighbouring code 360 answers with a real, plausible rate —
// Indonesia's. Anyone "fixing" the 400 by reaching for 360 would ship Jakarta's
// tariff labelled Sydney, and every number downstream would look fine.
check("Australia has no WITS reporter", WITS_REPORTERS.AUS === undefined);
check("reporter 360 still belongs to Indonesia", WITS_REPORTERS.IDN?.code === 360);

const au = composeLandedCost(
  {
    hsCode: "610910",
    destinationIso: "AUS",
    fobInr: FOB,
    freightInr: FREIGHT,
    insuranceInr: INSURANCE,
  },
  AUS_DUTY
);

check("Australian duty is zero", au.buyer.dutyInr === 0);
check("so landed cost is just CIF", near(au.buyer.landedCostInr, CIF), `${au.buyer.landedCostInr}`);
// GST 10% on 1,092,000 = 109,200; buyer fronts 1,201,200.
check("GST is 10%", au.buyer.vat?.ratePct === 10);
check("GST is charged on CIF plus duty", near(au.buyer.vat.amountInr, 109_200), `${au.buyer.vat?.amountInr}`);
check("cash at border is 1,201,200", near(au.buyer.cashAtBorderInr, 1_201_200), `${au.buyer.cashAtBorderInr}`);
check("GST is reclaimable by a registered buyer", au.buyer.vat?.recoverable === true);

// The two ways this could quietly start lying about what the number is.
const auText = au.caveats.join(" ");
check(
  "the duty is not described as an MFN rate",
  !/Duty is the MFN rate/.test(auText),
  au.caveats[0]?.slice(0, 70)
);
check("it is named as a treaty rate instead", /treaty rate/i.test(auText));
check(
  "the agreement is not said to overstate the duty it already is",
  !/likely overstates/.test(auText)
);
check(
  "and the Certificate of Origin condition is stated",
  /Certificate of Origin/i.test(auText)
);
check("Australia's ECTA entry is in force", AGREEMENTS.AUS?.status === "in-force");
check("isTreatyPriced agrees for Australia", isTreatyPriced("AUS") === true);
check("isTreatyPriced is case-insensitive", isTreatyPriced("aus") === true);
// Germany has no agreement and the UK has one; neither is treaty-PRICED, and
// conflating "has an FTA" with "is priced from it" is what put a false
// sentence under the picker in the first place.
check("a TRAINS-priced FTA market is not treaty-priced", isTreatyPriced("GBR") === false);
check("a market with no agreement is not treaty-priced", isTreatyPriced("DEU") === false);

// ── Scope is three-valued, and each value behaves differently ───────────────
// The February 2026 joint statement names categories on both sides, so a
// chapter can be positively covered, positively exempt, or simply unnamed.
const DUTY_US = (hs, mfn) => ({
  iso3: "USA",
  country: "United States",
  hsCode: hs,
  mfnRatePct: mfn,
  minRatePct: null,
  maxRatePct: null,
  year: 2023,
  lineCount: null,
});

// Textiles (61) are named in scope; pharmaceuticals (30), gems (71) and
// aircraft parts (88) are named for removal; furniture (94) is named only as
// "home décor", which does not map onto a chapter.
check("textiles are in scope", surchargeFor("USA", "610910")?.scope === "in-scope");
check("leather goods are in scope", surchargeFor("USA", "420221")?.scope === "in-scope");
check("organic chemicals are in scope", surchargeFor("USA", "290511")?.scope === "in-scope");
check("pharmaceuticals are named exempt", surchargeFor("USA", "300490")?.scope === "out-of-scope");
check("gems and diamonds are named exempt", surchargeFor("USA", "711319")?.scope === "out-of-scope");
check("aircraft parts are named exempt", surchargeFor("USA", "880330")?.scope === "out-of-scope");
check("an unnamed chapter is unknown, not exempt", surchargeFor("USA", "940360")?.scope === "unknown");

// The rate follows the scope. An exempt line must carry no figure at all —
// showing one would invent a cost the exporter would then price in.
check("an exempt line carries no rate", surchargeFor("USA", "300490")?.applicableRatePct === null);
check("an in-scope line carries the rate", surchargeFor("USA", "610910")?.applicableRatePct === 18);
// An unresolved line carries the rate as EXPOSURE. This is the case the old
// behaviour handled worst: silence read as "no surcharge".
check("an unresolved line carries it as exposure", surchargeFor("USA", "940360")?.applicableRatePct === 18);

const exempt = composeLandedCost(
  { hsCode: "300490", destinationIso: "USA", fobInr: FOB },
  DUTY_US("300490", 0)
);
check("an exempt product gets no conditional figure", exempt.surcharge?.ifAppliedLandedCostInr === null);
check(
  "and is told the exemption is named rather than assumed",
  exempt.caveats.some((c) => /named as exempt/i.test(c))
);

const unresolved = composeLandedCost(
  { hsCode: "940360", destinationIso: "USA", fobInr: FOB },
  DUTY_US("940360", 0)
);
check(
  "an unresolved product still gets the exposure figure",
  near(unresolved.surcharge.ifAppliedLandedCostInr, 1_180_000),
  `${unresolved.surcharge?.ifAppliedLandedCostInr}`
);
check(
  "and is told we cannot tell, rather than that it is safe",
  unresolved.caveats.some((c) => /cannot tell/i.test(c))
);

// CBAM is priced on embedded carbon, so there is no percentage that could go
// into a conditional figure. It must stay null however in-scope the goods are.
const cbam = composeLandedCost(
  { hsCode: "730890", destinationIso: "DEU", fobInr: FOB },
  dest("DEU", "Germany", "730890", 2)
);
check("CBAM is in scope for steel", cbam.surcharge?.scope === "in-scope");
check("but carries no conditional figure, being a carbon levy", cbam.surcharge?.ifAppliedLandedCostInr === null);

// ── The narrative must carry the corrected figure, not just the caveats ─────
// Saathi answers from the narrative; a number that only exists in a caveat is
// a number the model may not repeat.
const narrative = describe(
  composeLandedCost(
    { hsCode: "610910", destinationIso: "USA", fobInr: FOB, freightInr: FREIGHT, insuranceInr: INSURANCE },
    DUTY_US("610910", 16.5)
  )
);
check("the narrative states the real landed cost", /14,37,000/.test(narrative), narrative.slice(0, 90));
check("and instructs that the higher figure is the one to quote", /quote the higher figure/i.test(narrative));

// ── Staleness is stated, not implied ────────────────────────────────────────
// This measure moved four times in twelve months. A `since` date alone reads
// as currency the figure does not have.
check("every measure records when it was last checked", Boolean(MEASURES.USA?.asOf));
check(
  "and the sentence says so rather than implying it is live",
  /as we last checked it in/i.test(us.caveats.join(" "))
);
check(
  "the note warns the rate may have moved since",
  /not as today's certainty/i.test(us.caveats.join(" "))
);

console.log(
  `\n${failed === 0 ? "all landed-cost checks passed" : `${failed} check(s) FAILED`}` +
    ` (${passed} passed)`
);
process.exit(failed ? 1 : 0);
