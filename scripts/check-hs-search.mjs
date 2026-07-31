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

console.log(`\n${tariffFailed === 0 ? "all" : "some"} tariff-line checks ${tariffFailed ? "FAILED" : "passed"}`);
process.exit(failed + tariffFailed ? 1 : 0);
