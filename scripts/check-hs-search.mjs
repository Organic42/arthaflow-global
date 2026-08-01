/**
 * Regression check for HS retrieval.
 *
 * Retrieval is the part of classification that can fail silently: if the right
 * code is not in the shortlist, the model cannot choose it, and the manufacturer
 * gets a confident answer derived from the wrong code. These cases are the ones
 * that have actually broken. Run after touching classify.ts or aliases.ts:
 *
 *   node scripts/check-hs-search.mjs
 *
 * Uses tsx to load the TypeScript directly, so there is no build step.
 */
import { searchHsCodes } from "../src/lib/hs/classify.ts";
import {
  tariffLinesFor,
  lookupTariffLine,
  itchsDatasetSize,
} from "../src/lib/hs/itchs.ts";
import {
  lookupRodtep,
  describeRodtep,
  rodtepDatasetSize,
} from "../src/lib/hs/rodtep.ts";
import {
  drawbackForHsCode,
  describeDrawback,
  drawbackHeadingCount,
} from "../src/lib/hs/drawback.ts";
import {
  WITS_REPORTERS,
  supportedDestinations,
} from "../src/lib/tariff/destination.ts";
import {
  dutyBasisFor,
  landedCost,
} from "../src/lib/tariff/landed-cost.ts";
import {
  assessVat,
  vatAbsenceReason,
  vatCoverage,
} from "../src/lib/tariff/vat.ts";
import {
  agreementFor,
  describeAgreement,
  agreementCoverage,
} from "../src/lib/tariff/fta.ts";
import {
  detectScript,
  replyMatchesInput,
  isDegenerate,
} from "../src/lib/saathi/language.ts";

/** [query, expected code, max acceptable rank] — rank is 1-based. */
const CASES = [
  // The material-vs-function trap. 8302 shares no word with the query; the
  // alias table has to bridge it, and raw copper must not crowd it out.
  ["brass door handles", "830241", 3],
  ["stainless steel door handles", "830241", 5],
  ["cabinet handles", "830242", 5],

  // Raw material queries must still reach raw material codes — the demotion
  // only fires on a phrase match, so these should be unaffected.
  ["brass wire", "740821", 3],
  ["copper tubes", "741121", 3],

  // Vernacular. These returned nothing at all before the Indic tokenizer fix.
  ["चमड़े के बैग", "420221", 5],
  ["leather bags", "420221", 3],
  ["haldi", "091030", 5],

  // Everyday exports that should simply work.
  ["basmati rice", "100630", 5],
  ["cotton t-shirts", "610910", 5],
];

let failed = 0;

for (const [query, expected, maxRank] of CASES) {
  const results = searchHsCodes(query, { limit: 8 });
  const rank = results.findIndex((r) => r.code === expected) + 1;
  const ok = rank > 0 && rank <= maxRank;
  if (!ok) failed++;

  const status = ok ? "PASS" : "FAIL";
  const where = rank === 0 ? "absent from top 8" : `rank ${rank}`;
  console.log(`${status}  ${query.padEnd(30)} expect ${expected} within ${maxRank} — ${where}`);
  if (!ok) {
    console.log(`      got: ${results.slice(0, 5).map((r) => `${r.code} (${r.score})`).join(", ")}`);
  }
}

console.log(`\n${CASES.length - failed}/${CASES.length} search cases passed`);

// ── Indian tariff line (ITC-HS 8-digit) ──────────────────────────────────────
// Separate from search because these do not go through ranking: a 6-digit
// heading either has the right children or the dataset is wrong.
console.log("\nITC-HS 8-digit tariff lines\n");

let tariffFailed = 0;
const check = (label, condition, detail) => {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${condition ? "" : ` — ${detail}`}`);
  if (!condition) tariffFailed++;
};

check(
  `dataset size looks like the full schedule (${itchsDatasetSize()})`,
  itchsDatasetSize() > 11000,
  `only ${itchsDatasetSize()} lines`
);

// The material-vs-function trap again, one level deeper. 391722 is plastic
// pipes and 7306 is steel pipes; a competitor shipped the steel description
// against the plastic code, so guard that they stay distinct.
const plastic = lookupTariffLine("39172200");
const steel = tariffLinesFor("730630");
check(
  "39172200 is plastic, not steel",
  !!plastic && /polymer|plastic|propylene/i.test(plastic.description) && !/iron|steel/i.test(plastic.description),
  `got "${plastic?.description}"`
);
check(
  "730630 lines are iron or steel",
  steel.length > 0 && steel.every((l) => /iron|steel|other/i.test(l.description)),
  `got ${steel.map((l) => l.code).join(", ")}`
);

// Leather handbags — the code the vernacular tests resolve to.
const bags = tariffLinesFor("420221");
check(
  "420221 has Indian tariff lines",
  bags.length > 0,
  "no lines found"
);

// Every line must carry a policy, because a blank renders as authoritative.
const sample = [...bags, ...steel];
check(
  "every tariff line carries an export policy",
  sample.length > 0 && sample.every((l) => ["Free", "Restricted", "Prohibited", "STE"].includes(l.policy)),
  "a line has no policy"
);

// A 6-digit code must never be mistaken for a tariff line.
check(
  "6-digit code is not a valid tariff line",
  lookupTariffLine("420221") === null,
  "6-digit code resolved as an 8-digit line"
);

// ── RoDTEP rebate rates ──────────────────────────────────────────────────────
check(
  `RoDTEP schedule looks complete (${rodtepDatasetSize()})`,
  rodtepDatasetSize() > 10000,
  `only ${rodtepDatasetSize()} lines`
);

const bagRate = lookupRodtep("42022110");
check(
  "42022110 has a RoDTEP rate",
  !!bagRate && bagRate.notifiedRatePct > 0,
  `got ${JSON.stringify(bagRate)}`
);

// Rates are percentages of FOB. Anything above ~10% means a parse slipped a
// column — the schedule's ceiling is well under that.
const allRatesSane = ["42022110", "73061100", "39172200", "03011100"]
  .map(lookupRodtep)
  .filter(Boolean)
  .every((r) => r.notifiedRatePct > 0 && r.notifiedRatePct <= 10);
check("sampled rates are within a plausible range", allRatesSane, "a rate is out of range");

check(
  "6-digit code returns no RoDTEP rate",
  lookupRodtep("420221") === null,
  "a 6-digit code resolved a rate"
);

// A line absent from the schedule must return null, not zero — "no rebate" and
// "a rebate of nothing" read differently to an exporter.
check(
  "unknown tariff line returns null, not a zero rate",
  lookupRodtep("99999999") === null,
  "unknown line did not return null"
);

// The description must never collapse the limitation into one number.
const described = bagRate ? describeRodtep(bagRate) : "";
check(
  "rate description carries the 50% limitation",
  described.includes("50%") && described.toLowerCase().includes("notified"),
  `got "${described.slice(0, 90)}"`
);

// ── Duty Drawback ────────────────────────────────────────────────────────────
// Keyed on the 4-digit heading, because that is the only level where the
// drawback schedule and ITC-HS agree. These guard that we never present a
// heading-level rate as though it belonged to a tariff line.
check(
  `drawback schedule looks complete (${drawbackHeadingCount()} headings)`,
  drawbackHeadingCount() > 900,
  `only ${drawbackHeadingCount()} headings`
);

// 7306 carries a single heading-level rate, so it is answerable precisely.
const steelDbk = drawbackForHsCode("73063010");
check(
  "7306 drawback resolves and is unambiguous",
  !!steelDbk && steelDbk.unambiguous && steelDbk.heading === "7306",
  `got heading ${steelDbk?.heading}, unambiguous=${steelDbk?.unambiguous}`
);

// 4202 splits into several rates, so it must NOT be reported as one number.
const bagDbk = drawbackForHsCode("42022110");
check(
  "4202 drawback is flagged ambiguous",
  !!bagDbk && !bagDbk.unambiguous && bagDbk.items.length > 1,
  `got ${bagDbk?.items.length} items, unambiguous=${bagDbk?.unambiguous}`
);

const bagText = bagDbk ? describeDrawback(bagDbk) : "";
check(
  "ambiguous drawback discloses the ITC-HS mismatch",
  bagText.includes("does NOT align") || bagText.includes("cannot be attributed"),
  `got "${bagText.slice(0, 100)}"`
);

check(
  "drawback resolves via heading regardless of input code length",
  drawbackForHsCode("7306")?.heading === "7306" &&
    drawbackForHsCode("730630")?.heading === "7306",
  "heading resolution differs by input length"
);

// ── Destination import duty ──────────────────────────────────────────────────
// Offline checks only: the country map is the part that silently breaks, and
// it must not be validated against a live API in a regression run.
check(
  `destination coverage looks right (${supportedDestinations().length})`,
  supportedDestinations().length > 40,
  `only ${supportedDestinations().length} destinations`
);

// WITS does not use Comtrade's M49 codes. USA is the one that bites: Comtrade
// says 842, WITS rejects it and wants 840.
check(
  "USA uses the WITS code 840, not Comtrade's 842",
  WITS_REPORTERS.USA?.code === 840,
  `got ${WITS_REPORTERS.USA?.code}`
);
check(
  "India resolves to 356",
  WITS_REPORTERS.IND?.code === 356,
  `got ${WITS_REPORTERS.IND?.code}`
);

// Countries TRAINS held no rate for are deliberately absent rather than
// present-and-broken, so an unsupported destination fails loudly.
check(
  "countries with no TRAINS data are omitted, not guessed",
  !("BEL" in WITS_REPORTERS) && !("AUS" in WITS_REPORTERS),
  "an unverified country is in the map"
);

// Every code must be a plausible numeric country code.
check(
  "every destination code is a positive integer",
  Object.values(WITS_REPORTERS).every(
    (r) => Number.isInteger(r.code) && r.code > 0 && r.code < 1000
  ),
  "a code is out of range"
);

// ── Landed cost ──────────────────────────────────────────────────────────────
// The duty basis is the quietest way this calculation goes wrong: charging
// Germany's rate on FOB, or America's on CIF, yields a plausible wrong number.
check(
  "USA and Canada assess duty on FOB",
  dutyBasisFor("USA") === "FOB" && dutyBasisFor("CAN") === "FOB",
  `USA=${dutyBasisFor("USA")}, CAN=${dutyBasisFor("CAN")}`
);
check(
  "everyone else defaults to CIF",
  dutyBasisFor("DEU") === "CIF" &&
    dutyBasisFor("ARE") === "CIF" &&
    dutyBasisFor("JPN") === "CIF",
  "a country defaulted to the wrong basis"
);
check(
  "duty basis is case- and whitespace-insensitive",
  dutyBasisFor(" usa ") === "FOB",
  `got ${dutyBasisFor(" usa ")}`
);

// Input validation must reject before any network call.
const badFob = await landedCost({ hsCode: "420221", destinationIso: "DEU", fobInr: 0 });
check(
  "landed cost refuses a zero or missing invoice value",
  badFob.ok === false,
  "it accepted an invalid FOB"
);

// ── Destination VAT ──────────────────────────────────────────────────────────
check(
  `VAT coverage looks right (${vatCoverage()} countries)`,
  vatCoverage() > 35,
  `only ${vatCoverage()} countries`
);

// VAT compounds on the duty. Charging it on CIF alone understates it by the
// VAT rate applied to the duty — a silent shortfall on every estimate.
const deVat = assessVat("DEU", 566500);
check(
  "VAT is charged on CIF plus duty, at the right rate",
  !!deVat && deVat.ratePct === 19 && Math.round(deVat.amountInr) === 107635,
  `got ${JSON.stringify(deVat)}`
);

// A recoverable tax must never be reported like a price increase.
check(
  "EU VAT is marked recoverable",
  deVat?.recoverable === true,
  "German VAT was not marked recoverable"
);
check(
  "Malaysian SST is marked NOT recoverable",
  assessVat("MYS", 100000)?.recoverable === false,
  "SST was wrongly marked recoverable"
);

// "No VAT" and "we don't know" are different answers.
check(
  "USA levies no import VAT and says why",
  assessVat("USA", 100000) === null &&
    /no VAT/i.test(vatAbsenceReason("USA")),
  `got "${vatAbsenceReason("USA")}"`
);
check(
  "an unrecorded country is not silently treated as zero-VAT",
  assessVat("ZZZ", 100000) === null &&
    /not recorded/i.test(vatAbsenceReason("ZZZ")),
  `got "${vatAbsenceReason("ZZZ")}"`
);

// ── Trade agreements ─────────────────────────────────────────────────────────
// This module states eligibility, never a preferential rate — WITS serves none
// and the official schedules are unreachable. These checks pin that boundary.
check(
  `agreement coverage looks right (${agreementCoverage()})`,
  agreementCoverage() >= 8,
  `only ${agreementCoverage()} agreements`
);

const uae = agreementFor("ARE");
check(
  "UAE CEPA is in force and claimable",
  uae?.claimable === true && uae.agreement.inForceSince === "2022-05-01",
  `got ${JSON.stringify(uae?.agreement)}`
);

// Germany has no bilateral agreement with India in force.
check(
  "a destination with no agreement returns null",
  agreementFor("DEU") === null && agreementFor("USA") === null,
  "an agreement was claimed where none exists"
);

// The whole point: never state or imply a preferential percentage.
const uaeText = uae ? describeAgreement(uae, 5) : "";
check(
  "agreement text refuses to state a preferential rate",
  /do not hold the preferential rate/i.test(uaeText) &&
    !/\b0%\s*(under|preferential)/i.test(uaeText),
  `got "${uaeText.slice(0, 120)}"`
);

// Claiming the duty is overstated is false when MFN is already zero.
const sgp = agreementFor("SGP");
check(
  "a zero MFN rate does not claim the duty is overstated",
  sgp !== null &&
    /already 0%/.test(describeAgreement(sgp, 0)) &&
    !/likely HIGHER/.test(describeAgreement(sgp, 0)),
  "zero-rate wording was not adjusted"
);

// A Certificate of Origin is the mechanism; without it the MFN rate applies.
check(
  "the claim process is stated, not assumed",
  /Certificate of Origin/i.test(uaeText) && /Without it the MFN rate applies/i.test(uaeText),
  "claim process missing"
);

// ── Language enforcement ─────────────────────────────────────────────────────
// Measured live, a Hindi question came back in Hindi 1 time in 5. These pin the
// detection that now catches it, since the retry is only as good as the check.
check(
  "Devanagari input is detected",
  detectScript("मैं चमड़े के बैग बनाता हूँ") === "devanagari",
  "Hindi read as something else"
);
check(
  "English input is detected",
  detectScript("Where can I export leather bags?") === "latin",
  "English read as something else"
);

// A Hindi question containing English trade terms is still a Hindi question —
// treating it as English is the exact failure being fixed.
check(
  "mixed Hindi with English terms counts as Devanagari",
  detectScript("मुझे HS code 420221 की जानकारी चाहिए") === "devanagari",
  "mixed input misread as English"
);

// An English answer to a Hindi question must be caught.
check(
  "English reply to a Hindi question is rejected",
  replyMatchesInput(
    "मुझे किस देश में निर्यात करना चाहिए?",
    "Using HS 420221, the top importers in 2024 were China, the United States and Hong Kong."
  ) === false,
  "the wrong-language answer was accepted"
);

// A real Hindi answer carries HS codes, country names and figures in Latin —
// that must still pass, or the retry would fire on correct answers.
check(
  "Hindi reply containing English terms is accepted",
  replyMatchesInput(
    "मुझे किस देश में निर्यात करना चाहिए?",
    "आपके चमड़े के बैग (HS 420221) के लिए सबसे अच्छे बाजार चीन ($2333.6M), संयुक्त राज्य अमेरिका ($2303.7M) और Hong Kong हैं। क्या मैं demand trend दिखाऊं?"
  ) === true,
  "a correct Hindi answer was wrongly rejected"
);

// English in, English out is the common path and must never trigger a retry.
check(
  "English question answered in English is untouched",
  replyMatchesInput("Where can I export leather bags?", "China, the US and Hong Kong lead.") === true,
  "the common path would retry"
);

// The degeneration signature: 4,700 chars from ~10 distinct symbols.
check(
  "degenerate output is detected",
  isDegenerate("क ".repeat(1200)) === true &&
    isDegenerate("आपके चमड़े के बैग के लिए सबसे अच्छे बाजार चीन और अमेरिका हैं।") === false,
  "degeneration check is wrong"
);

console.log(`\n${tariffFailed === 0 ? "all" : "some"} tariff-line checks ${tariffFailed ? "FAILED" : "passed"}`);
process.exit(failed + tariffFailed ? 1 : 0);
