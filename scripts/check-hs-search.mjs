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

console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed ? 1 : 0);
