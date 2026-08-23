/**
 * Regression check for DGCIS prefix aggregation.
 *
 * The first version of dgcisIndiaExports required an exact 8-digit match, but
 * callers arrive holding 6-digit codes by design (classify.ts never lets an
 * 8-digit code reach a trade tool). That mismatch meant the lookup would never
 * have matched anything — dead code that fails silently by returning null and
 * falling through to WITS, so nothing would have caught it in normal use.
 * These checks pin the aggregation math so a regression there fails loudly.
 *
 *   node scripts/check-dgcis.mjs
 *
 * dgcis.ts imports its data with a static `import raw from "./dgcis.json"`,
 * so there is no injection seam — this script swaps the real file for a
 * fixture, imports fresh (first import in this process, so nothing is
 * cached yet), and restores the original content in a finally block. The
 * restore runs even if an assertion throws or the process is asked to exit,
 * so the vendored placeholder is never left overwritten.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DGCIS_JSON = path.join(ROOT, "src", "lib", "hs", "dgcis.json");

const FIXTURE = {
  source: "TEST FIXTURE — not real DGCIS data",
  sourceUrl: "https://trade-analytics.commerce.gov.in/public/de",
  financialYear: "2024-25",
  note: "check-dgcis.mjs fixture",
  hsCodeCount: 4,
  entries: {
    // Two lines under 420221, a third under 4202 but a different heading —
    // exercises 8-digit exact, 6-digit aggregate, and 4-digit aggregate in
    // one fixture. Numbers match a fixture manually verified earlier
    // against the real portal's CSV shape.
    "42022110": {
      description: "LEATHER HANDBAGS",
      totalUsd: 21_000_000,
      destinations: [
        { iso3: "USA", valueUsd: 12_000_000 },
        { iso3: "DEU", valueUsd: 6_000_000 },
        { iso3: "ARE", valueUsd: 3_000_000 },
      ],
    },
    "42022190": {
      description: "OTHER LEATHER HANDBAGS",
      totalUsd: 6_000_000,
      destinations: [
        { iso3: "USA", valueUsd: 4_000_000 },
        { iso3: "ITA", valueUsd: 2_000_000 },
      ],
    },
    "42022900": {
      description: "OTHER HANDBAGS",
      totalUsd: 1_000_000,
      destinations: [{ iso3: "DEU", valueUsd: 1_000_000 }],
    },
    // Unrelated chapter, single line — the "one line, no aggregation" case.
    "72163300": {
      description: "STEEL SECTIONS",
      totalUsd: 50_000_000,
      destinations: [{ iso3: "USA", valueUsd: 50_000_000 }],
    },
  },
};

let failed = 0;
const check = (label, condition, detail) => {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${condition ? "" : ` — ${detail}`}`);
  if (!condition) failed++;
};

const originalJson = readFileSync(DGCIS_JSON, "utf-8");

try {
  writeFileSync(DGCIS_JSON, JSON.stringify(FIXTURE), "utf-8");

  const { dgcisIndiaExports, dgcisHasData, dgcisCodeCount } = await import(
    "../src/lib/hs/dgcis.ts"
  );

  check(
    "dgcisHasData() is true once a real export is loaded",
    dgcisHasData() === true,
    "fixture was not detected as real data"
  );
  check(
    "dgcisCodeCount() matches the fixture",
    dgcisCodeCount() === 4,
    `got ${dgcisCodeCount()}`
  );

  // ── Exact 8-digit line — no aggregation, description preserved ──────────────
  const exact = dgcisIndiaExports("42022110");
  check(
    "8-digit exact match resolves a single line",
    !!exact && exact.linesAggregated === 1 && exact.description === "LEATHER HANDBAGS",
    `got ${JSON.stringify(exact)}`
  );
  check(
    "8-digit exact match total and top destination are correct",
    exact?.totalUsdM === 21 &&
      exact.destinations[0].iso3 === "USA" &&
      exact.destinations[0].valueUsdM === 12 &&
      exact.destinations[0].sharePct === 57.1,
    `got ${JSON.stringify(exact?.destinations)}`
  );

  // ── 6-digit prefix — aggregates 42022110 + 42022190 ──────────────────────────
  const six = dgcisIndiaExports("420221");
  check(
    "6-digit prefix aggregates exactly the two matching lines",
    !!six && six.linesAggregated === 2,
    `got linesAggregated=${six?.linesAggregated}`
  );
  check(
    "6-digit prefix total sums both lines (21M + 6M)",
    six?.totalUsdM === 27,
    `got ${six?.totalUsdM}`
  );
  check(
    "6-digit prefix merges USA across both lines (12M + 4M) and re-ranks",
    six?.destinations[0].iso3 === "USA" &&
      six.destinations[0].valueUsdM === 16 &&
      six.destinations[0].sharePct === 59.3,
    `got ${JSON.stringify(six?.destinations)}`
  );
  check(
    "6-digit prefix keeps DEU, ARE and ITA ranked by merged value",
    six?.destinations.map((d) => d.iso3).join(",") === "USA,DEU,ARE,ITA",
    `got ${six?.destinations.map((d) => d.iso3).join(",")}`
  );
  check(
    "aggregated result carries no single line's description",
    six?.description === "",
    `got "${six?.description}"`
  );

  // ── 4-digit prefix — aggregates all three 4202 lines, a different heading (7216) excluded ──
  const four = dgcisIndiaExports("4202");
  check(
    "4-digit prefix aggregates all three matching lines, not the unrelated heading",
    !!four && four.linesAggregated === 3,
    `got linesAggregated=${four?.linesAggregated}`
  );
  check(
    "4-digit prefix total sums all three lines (21M + 6M + 1M)",
    four?.totalUsdM === 28,
    `got ${four?.totalUsdM}`
  );
  check(
    "4-digit prefix merges DEU across two lines (6M + 1M)",
    four?.destinations.find((d) => d.iso3 === "DEU")?.valueUsdM === 7,
    `got ${JSON.stringify(four?.destinations)}`
  );

  // ── Single-line prefix elsewhere in the dataset — must not pick up 4202 ─────
  const steel = dgcisIndiaExports("7216");
  check(
    "an unrelated prefix aggregates only its own line",
    !!steel && steel.linesAggregated === 1 && steel.totalUsdM === 50,
    `got ${JSON.stringify(steel)}`
  );

  // ── Absence and input validation ─────────────────────────────────────────────
  check(
    "a prefix with no match returns null, not an empty aggregate",
    dgcisIndiaExports("9999") === null,
    "unmatched prefix did not return null"
  );
  check(
    "an invalid prefix length (odd digit count) is rejected before any lookup",
    dgcisIndiaExports("1") === null &&
      dgcisIndiaExports("123") === null &&
      dgcisIndiaExports("12345") === null,
    "a structurally invalid prefix was not rejected"
  );

  // ── End-to-end: getIndiaExports actually routes through DGCIS ───────────────
  // Offline only — this must resolve entirely from the fixture and never reach
  // Comtrade, the same discipline the destination-duty checks in
  // check-hs-search.mjs already hold to.
  const { getIndiaExports } = await import("../src/lib/comtrade/tools.ts");
  const routed = await getIndiaExports({ hsCode: "420221" });
  check(
    "getIndiaExports resolves via DGCIS when the fixture has the code",
    routed.ok === true && routed.data.source === "dgcis",
    `got ${JSON.stringify(routed)}`
  );
  check(
    "the narrative states the financial year and the line-span disclosure",
    routed.ok === true &&
      routed.narrative.includes("FY 2024-25") &&
      routed.narrative.includes("covers all 2 Indian tariff lines"),
    `got "${routed.ok ? routed.narrative : ""}"`
  );
} finally {
  // Always restore, including on a thrown assertion or a bad exit — the
  // committed placeholder must never be left overwritten by a fixture.
  writeFileSync(DGCIS_JSON, originalJson, "utf-8");
}

console.log(`\n${failed === 0 ? "all" : "some"} DGCIS aggregation checks ${failed ? "FAILED" : "passed"}`);
process.exit(failed ? 1 : 0);
