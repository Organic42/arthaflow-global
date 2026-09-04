/**
 * Checks the trade-trend arithmetic — the series Saathi quotes when a
 * manufacturer asks "is demand for my product growing?"
 *
 *     npm run test:trend
 *
 * WHY THIS SUITE EXISTS
 * composeTrend() used to be an inline `?? 0` over the requested years. That
 * defaulting turned "the reporter has not published this year yet" into "this
 * market bought nothing", and because growth was anchored on the LAST element
 * of the series, an unpublished final year produced exactly this:
 *
 *   Germany total imports of HS 420221: 2020: $410M, 2021: $430M,
 *   2022: $455M, 2023: $480M, 2024: $0M (-100% total growth)
 *
 * A market that grew 17% over four years, reported to a manufacturer as a
 * total collapse. Nothing about the sentence looks broken, which is what makes
 * it the dangerous kind of wrong — it is quotable, confident, and would move a
 * real sourcing decision the wrong way.
 *
 * An unpublished recent year is not the rare case. `currentDataYear()` already
 * backs off two years because the top of Comtrade is routinely empty, so the
 * four-good-years-and-a-gap shape was close to the DEFAULT response.
 *
 * Every expectation below is computed by hand in the comment above it. The
 * composer takes the year list and the value map as arguments, so none of this
 * needs a network.
 */
import { composeTrend } from "../src/lib/comtrade/tools.ts";

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

/** Percentages are rounded to 0.1, so compare with that tolerance. */
const near = (a, b) => a !== null && Math.abs(a - b) < 0.05;

const M = (n) => n * 1_000_000;

// ── The regression that motivated the suite ─────────────────────────────────
// Four filed years, the fifth unpublished. Real span 2020→2023:
//   480/410 = 1.170731…  → +17.1% total
//   1.170731^(1/3) = 1.05389…  → +5.4% a year
{
  const years = [2024, 2023, 2022, 2021, 2020];
  const byYear = new Map([
    [2023, M(480)],
    [2022, M(455)],
    [2021, M(430)],
    [2020, M(410)],
  ]);
  const t = composeTrend(years, byYear);

  check(
    "an unpublished final year does not read as a market collapse",
    t.totalGrowthPct !== -100,
    `got ${t.totalGrowthPct}`
  );
  check(
    "growth is measured across the years actually filed",
    near(t.totalGrowthPct, 17.1),
    `expected 17.1, got ${t.totalGrowthPct}`
  );
  check("CAGR compounds over the filed span", near(t.cagr, 5.4), `got ${t.cagr}`);
  check(
    "the measured span names its own endpoints",
    t.measuredFrom === 2020 && t.measuredTo === 2023,
    `got ${t.measuredFrom}-${t.measuredTo}`
  );
  check(
    "the unfiled year is named rather than imputed",
    t.unreportedYears.length === 1 && t.unreportedYears[0] === 2024,
    `got [${t.unreportedYears}]`
  );
  check(
    "the unfiled year is marked unreported",
    t.points.find((p) => p.year === 2024)?.reported === false
  );
  check(
    "filed years stay marked reported",
    t.points.filter((p) => p.reported).length === 4
  );
}

// ── Ordering: the composer must not depend on how years arrive ──────────────
// Comtrade periods come back in no guaranteed order, and the old code relied
// on the caller having built the array descending before reversing it.
{
  const ascending = composeTrend([2020, 2021, 2022], new Map([[2020, M(100)], [2021, M(110)], [2022, M(121)]]));
  const scrambled = composeTrend([2022, 2020, 2021], new Map([[2021, M(110)], [2022, M(121)], [2020, M(100)]]));

  check(
    "a scrambled year list produces the same series as a sorted one",
    JSON.stringify(ascending) === JSON.stringify(scrambled)
  );
  // 121/100 = 1.21 over 2 periods → sqrt(1.21) = 1.1 → +10.0% a year
  check("CAGR on a clean 3-year series", near(ascending.cagr, 10.0), `got ${ascending.cagr}`);
  check("total growth on a clean 3-year series", near(ascending.totalGrowthPct, 21.0));
  check("points come out in chronological order", ascending.points.map((p) => p.year).join() === "2020,2021,2022");
}

// ── A gap in the MIDDLE must not shorten the compounding period ─────────────
// Filed 2020 ($100M) and 2024 ($200M), nothing between. Doubling over four
// elapsed years is 2^(1/4) = 1.1892… → +18.9% a year. Counting only the two
// filings would give 2^(1/1) = +100%, which would be wrong by 5x.
{
  const t = composeTrend(
    [2020, 2021, 2022, 2023, 2024],
    new Map([[2020, M(100)], [2024, M(200)]])
  );
  check("an interior gap compounds over elapsed years, not filings", near(t.cagr, 18.9), `got ${t.cagr}`);
  check("total growth still spans the real endpoints", near(t.totalGrowthPct, 100.0));
  check(
    "every unfiled interior year is named",
    t.unreportedYears.join() === "2021,2022,2023",
    `got [${t.unreportedYears}]`
  );
}

// ── Year-over-year steps need two real observations ─────────────────────────
{
  const t = composeTrend(
    [2020, 2021, 2022],
    new Map([[2020, M(100)], [2022, M(121)]])
  );
  const p = Object.fromEntries(t.points.map((x) => [x.year, x]));

  check("the first year has no prior, so no step", p[2020].growthPct === null);
  check("an unfiled year states no step of its own", p[2021].growthPct === null);
  check(
    "a filed year following a gap does not invent a step across it",
    p[2022].growthPct === null,
    `got ${p[2022].growthPct}`
  );
}

// ── Genuine decline must still be reported as decline ───────────────────────
// The fix must not have made the composer refuse to report bad news.
// 300 → 240 is -20.0% total; over 2 periods (240/300)^(1/2) = 0.8944 → -10.6%.
{
  const t = composeTrend(
    [2021, 2022, 2023],
    new Map([[2021, M(300)], [2022, M(270)], [2023, M(240)]])
  );
  check("a real decline is reported as a decline", near(t.totalGrowthPct, -20.0), `got ${t.totalGrowthPct}`);
  check("a declining CAGR stays negative", t.cagr !== null && t.cagr < 0, `got ${t.cagr}`);
  check("negative CAGR magnitude is right", near(t.cagr, -10.6), `got ${t.cagr}`);
}

// ── A reported ZERO is a different fact from an unreported year ─────────────
// If a reporter genuinely filed zero trade, that IS an observation — the point
// must be marked reported even though the value is 0, so the narrative quotes
// it instead of silently dropping it.
{
  const t = composeTrend([2022, 2023], new Map([[2022, M(50)], [2023, 0]]));
  const p = Object.fromEntries(t.points.map((x) => [x.year, x]));

  check("a filed zero counts as reported", p[2023].reported === true);
  check("a filed zero is not listed as an unreported year", t.unreportedYears.length === 0);
  // But it still cannot anchor a rate: growth INTO zero is -100% and out of
  // zero is infinite, so with only one positive year there is no rate at all.
  check("a single positive year yields no growth rate", t.totalGrowthPct === null, `got ${t.totalGrowthPct}`);
  check("a single positive year yields no CAGR", t.cagr === null);
}

// ── Degenerate inputs ───────────────────────────────────────────────────────
{
  const empty = composeTrend([2022, 2023, 2024], new Map());
  check("a wholly unfiled window yields no growth rate", empty.totalGrowthPct === null);
  check("a wholly unfiled window yields no CAGR", empty.cagr === null);
  check("a wholly unfiled window has no measured span", empty.measuredFrom === null && empty.measuredTo === null);
  check("a wholly unfiled window still returns a point per year", empty.points.length === 3);
  check("no point in a wholly unfiled window claims to be reported", empty.points.every((p) => !p.reported));

  const single = composeTrend([2023], new Map([[2023, M(90)]]));
  check("one filed year yields no rate", single.totalGrowthPct === null && single.cagr === null);
  check("one filed year still reports its own span", single.measuredFrom === 2023 && single.measuredTo === 2023);

  check("an empty year list does not throw", composeTrend([], new Map()).points.length === 0);
}

// ── Unit conversion ─────────────────────────────────────────────────────────
// valueUsdM is what the narrative and the chart both print, so it is pinned.
{
  const t = composeTrend([2023], new Map([[2023, 1_234_567_890]]));
  check("USD converts to millions rounded to 0.1", t.points[0].valueUsdM === 1234.6, `got ${t.points[0].valueUsdM}`);
  check("the raw USD figure is carried through unrounded", t.points[0].valueUsd === 1_234_567_890);
}

// ── The composer must never mutate its caller's inputs ──────────────────────
{
  const years = [2024, 2022, 2023];
  const byYear = new Map([[2022, M(10)], [2023, M(11)]]);
  composeTrend(years, byYear);
  check("the caller's year array is left in its original order", years.join() === "2024,2022,2023");
  check("the caller's value map is not written to", byYear.size === 2);
}

console.log(
  `\n${failed === 0 ? "all" : `${failed} FAILED,`} trade-trend checks ` +
    `${failed === 0 ? `passed (${passed} passed)` : `— ${passed} passed`}`
);
process.exit(failed === 0 ? 0 : 1);
