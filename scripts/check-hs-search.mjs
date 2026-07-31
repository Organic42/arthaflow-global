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

console.log(`\n${tariffFailed === 0 ? "all" : "some"} tariff-line checks ${tariffFailed ? "FAILED" : "passed"}`);
process.exit(failed + tariffFailed ? 1 : 0);
