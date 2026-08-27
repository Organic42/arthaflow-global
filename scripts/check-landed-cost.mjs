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
import { composeLandedCost, dutyBasisFor } from "../src/lib/tariff/landed-cost.ts";
import { WITS_REPORTERS } from "../src/lib/tariff/destination.ts";
import { AGREEMENTS } from "../src/lib/tariff/fta.ts";

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

// ── A surcharge is disclosed but never added to the duty ────────────────────
// surcharge.ts holds no per-line rate because scope is defined below the
// granularity we can verify, so the US measure is reported and explained
// rather than folded into the number. If that ever changes, this fails.
check("the US measure is attached", us.surcharge?.headlineRatePct === 18);
check("the US measure is in scope for this product", us.surcharge?.coversProduct === true);
check("the surcharge is NOT added to the duty", near(us.buyer.dutyInr, 80_000));
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
const orphans = Object.keys(AGREEMENTS).filter((iso) => !WITS_REPORTERS[iso]);
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

console.log(
  `\n${failed === 0 ? "all landed-cost checks passed" : `${failed} check(s) FAILED`}` +
    ` (${passed} passed)`
);
process.exit(failed ? 1 : 0);
