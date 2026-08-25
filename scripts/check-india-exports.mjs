/**
 * Regression checks for src/lib/hs/india-exports.ts.
 *
 *     npm run test:india-exports
 *
 * Guards the two things that would be silently wrong rather than loudly
 * broken: prefix aggregation (a 6-digit query must sum its 8-digit children,
 * not miss them) and disclosure (a rollup must say it is one, and must never
 * imply a destination it does not hold). Both are the exact class of bug the
 * DGCIS loader shipped with before check-dgcis.mjs caught it.
 *
 * Unlike that one this runs against the REAL vendored file rather than a
 * fixture. There is no swap-and-restore here because nothing is being
 * simulated: the expected totals are recomputed independently from the JSON
 * and compared against what the loader returns, so a re-ingested dataset of a
 * different shape fails immediately, which is the thing most likely to break.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const file = JSON.parse(
  readFileSync(path.join(ROOT, "src", "lib", "hs", "india-exports.json"), "utf8")
);

const years = file.financialYears;
const entries = file.entries;
const codes = Object.keys(entries);
const latest = years.length - 1;

// ── Shape ───────────────────────────────────────────────────────────────────
check("the dataset is not empty", codes.length > 0, `${codes.length} codes`);
check(
  "hsCodeCount matches the number of entries",
  file.hsCodeCount === codes.length,
  `${file.hsCodeCount} vs ${codes.length}`
);
check("at least two complete financial years", years.length >= 2, years.join(", "));
check(
  "every code is 8 digits",
  codes.every((c) => /^\d{8}$/.test(c)),
  codes.find((c) => !/^\d{8}$/.test(c))
);
check(
  "every row carries one value per financial year",
  codes.every((c) => entries[c].length === years.length)
);
check("no negative export values", codes.every((c) => entries[c].every((v) => v >= 0)));
check("the unit is recorded", file.unit === "USD million", file.unit);
check(
  "a part-year is excluded rather than averaged in",
  Array.isArray(file.partialYearsExcluded)
);

// ── Scale ───────────────────────────────────────────────────────────────────
// India's merchandise exports have run $420-460bn every year since FY2021-22,
// so the latest complete year has to land in that neighbourhood.
//
// THIS BAND USED TO BE $250bn-$600bn AND WAS USELESS. The first build of this
// dataset parsed "2,949.732" by calling float() directly inside a bare
// "except ValueError: pass", silently zeroing every comma-formatted figure. It
// produced $385bn — 13% light, entirely plausible-looking, and comfortably
// inside the old band. A tolerance wide enough to admit a wrong answer is not
// a check.
const total = codes.reduce((sum, c) => sum + entries[c][latest], 0);
check(
  "the latest year totals a plausible national figure ($400bn-$500bn)",
  total > 400_000 && total < 500_000,
  `$${Math.round(total).toLocaleString()} mn`
);

// The parser bug showed up as a deficit concentrated in the biggest lines, so
// pin one directly: pharmaceuticals nes is India's largest single tariff line.
const PHARMA = "30049099";
check(
  "the largest single line parses its comma-formatted value",
  entries[PHARMA] && entries[PHARMA][latest] > 10_000,
  entries[PHARMA] ? `$${entries[PHARMA][latest]} mn` : "missing"
);

// ── Aggregation, recomputed independently of the loader ─────────────────────
const byHeading = new Map();
for (const c of codes) {
  const h = c.slice(0, 6);
  if (!byHeading.has(h)) byHeading.set(h, []);
  byHeading.get(h).push(c);
}
let heading = null;
let best = 0;
for (const [h, kids] of byHeading) {
  if (kids.length < 3) continue;
  const v = kids.reduce((s, c) => s + entries[c][latest], 0);
  if (v > best) {
    best = v;
    heading = h;
  }
}
check("found a multi-line heading to test against", heading !== null, String(heading));

const kids = byHeading.get(heading) ?? [];
const expected = kids.reduce((s, c) => s + entries[c][latest], 0);

const { indiaExportsFor, describeIndiaExports, formatUsdMn } = await import(
  "../src/lib/hs/india-exports.ts"
);

const rollup = indiaExportsFor(heading);
check("a 6-digit prefix resolves", rollup !== null);
check(
  "the rollup sums every 8-digit line beneath it",
  rollup && Math.abs(rollup.latestUsdMn - expected) < 0.05,
  rollup ? `${rollup.latestUsdMn} vs ${expected.toFixed(3)}` : ""
);
check(
  "the rollup reports how many lines it summed",
  rollup && rollup.linesAggregated === kids.length,
  rollup ? `${rollup.linesAggregated} vs ${kids.length}` : ""
);
check(
  "the rollup narrative discloses that it is combined",
  rollup && describeIndiaExports(rollup).includes("combined")
);
check(
  "the narrative names the financial year",
  rollup && describeIndiaExports(rollup).includes(years[latest])
);
check(
  "the narrative refuses to imply a destination",
  rollup && /does not say which countries/.test(describeIndiaExports(rollup))
);

// ── A single line must not be described as a rollup ──────────────────────────
const one = indiaExportsFor(kids[0]);
check("an 8-digit line resolves", one !== null);
check("a single line reports linesAggregated of 1", one && one.linesAggregated === 1);
check(
  "a single line is not described as combined",
  one && !describeIndiaExports(one).includes("combined")
);

// ── Growth ──────────────────────────────────────────────────────────────────
// Dividing by a zero prior year is an infinite percentage; the loader must
// report no growth rather than Infinity or NaN reaching a page.
const zeroPrior = codes.find((c) => entries[c][latest - 1] === 0 && entries[c][latest] > 0);
if (zeroPrior) {
  const s = indiaExportsFor(zeroPrior);
  check(
    "growth from a zero prior year is null, not Infinity",
    s && s.growthPct === null,
    s ? String(s.growthPct) : ""
  );
} else {
  check("growth from a zero prior year is null, not Infinity", true, "no such line to test");
}
check(
  "no growth figure is NaN or Infinity",
  codes.slice(0, 500).every((c) => {
    const s = indiaExportsFor(c);
    return s === null || s.growthPct === null || Number.isFinite(s.growthPct);
  })
);

// ── Formatting ──────────────────────────────────────────────────────────────
check("billions render as bn", formatUsdMn(2500) === "$2.50 bn", formatUsdMn(2500));
check("millions render as mn", formatUsdMn(412.34) === "$412.3 mn", formatUsdMn(412.34));
check("sub-million renders as k", formatUsdMn(0.25) === "$250k", formatUsdMn(0.25));

// ── Rejections ──────────────────────────────────────────────────────────────
check("an odd-length prefix is rejected", indiaExportsFor("123") === null);
check("an empty query is rejected", indiaExportsFor("") === null);
// Not 99999999: that is a real DGCIS "unspecified" line with real values, and
// using it as an absent-code sentinel only passed by luck on a smaller build.
check(
  "a code with no data returns null",
  indiaExportsFor("00000000") === null,
  JSON.stringify(indiaExportsFor("00000000"))
);

console.log(
  `\n${failed === 0 ? "all India export checks passed" : `${failed} check(s) FAILED`}` +
    ` (${passed} passed)`
);
process.exit(failed ? 1 : 0);
