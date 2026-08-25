import file from "./india-exports.json";
import { lookupTariffLine } from "./itchs";
import { lookupHsCode } from "./classify";

/**
 * Which Indian export lines are growing, and which are shrinking.
 *
 * WHY A MATERIALITY FLOOR IS THE WHOLE DESIGN
 * Ranking 12,402 lines by compound growth without one produces a list of
 * rounding errors. ITC-HS 26070000 runs 0.00, 0.01, 0.02, 0.09, 0.04, 0.02,
 * 105.60 across the seven years — a 472% compound rate that describes six
 * years of nothing followed by a single shipment. The arithmetic is correct
 * and the number is meaningless, and a page led by figures like that is
 * clickbait wearing a dataset.
 *
 * So a line qualifies only if it was already material in the FIRST year and is
 * still material in the LAST. Both floors matter and they do different jobs:
 * the latest-year floor keeps out lines nobody ships now, and the base-year
 * floor is what stops a growth RATE being measured off noise. With both at
 * $25m the leaders become real sustained stories — spices at $28m to $313m,
 * iron structures at $32m to $355m — rather than accidents of rounding.
 *
 * The floors are stated on the page. A ranking whose method is hidden is not
 * evidence of anything, and this one exists to be checked.
 *
 * ABSOLUTE GAIN IS REPORTED SEPARATELY, NOT BLENDED IN. A line adding $400m at
 * 12% a year and one adding $40m at 60% are both interesting and they are not
 * the same fact. Merging them into a single score would hide which is which.
 */

interface RawFile {
  financialYears: string[];
  entries: Record<string, number[]>;
}

const FILE = file as RawFile;

/**
 * Minimum US$ million in BOTH the first and last year.
 *
 * $25m is roughly the point where a line represents a real trade rather than
 * incidental shipments, and it leaves ~1,100 lines to rank — enough that the
 * list is not arbitrary, few enough that every entry is worth reading.
 */
export const MATERIALITY_FLOOR_USD_MN = 25;

export interface GrowthRow {
  code: string;
  description: string;
  /**
   * The heading this line sits under, shown when the line's own description
   * does not stand alone. See headingContext().
   */
  context: string | null;
  /** Path to the tariff-line page, for linking. */
  href: string;
  values: number[];
  firstUsdMn: number;
  latestUsdMn: number;
  /** Compound annual growth across the whole series, as a percentage. */
  cagrPct: number;
  /** US$ million added (or lost) between the first and last year. */
  changeUsdMn: number;
  /**
   * How many of the year-on-year steps went up, out of the total.
   * A line that climbed every year is a different proposition from one that
   * spiked once and held, and the rate alone cannot tell them apart.
   */
  upYears: number;
  totalSteps: number;
}

export const GROWTH_YEARS = FILE.financialYears;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * A residual line's own description is often just "Other", because DGFT writes
 * it to be read underneath its heading rather than on its own. Ranked in a
 * list that mixes chapters, "Other" at +$4.5bn tells a reader nothing — and
 * several of the biggest movers are exactly these lines.
 *
 * So where a description does not stand alone, the heading is carried with it.
 * Returned separately rather than concatenated: the line's own words are what
 * DGFT published and should not be rewritten, and the page can present the
 * context as the secondary thing it is.
 */
function headingContext(code: string, description: string): string | null {
  if (!/^others?\b/i.test(description.trim())) return null;
  const heading = lookupHsCode(code.slice(0, 4));
  if (!heading) return null;
  // Trim DGFT's longer headings to something a row can carry.
  const text = heading.description.split(/[;:]/)[0].trim();
  return text.length > 78 ? `${text.slice(0, 78).trimEnd()}…` : text;
}

let cache: GrowthRow[] | null = null;

/**
 * Every line that clears both floors, with its growth measures.
 *
 * Computed once per process. The underlying file is vendored and static, so
 * recomputing per request would be twelve thousand iterations to reach the
 * same answer.
 */
export function growthTable(): GrowthRow[] {
  if (cache) return cache;

  const rows: GrowthRow[] = [];
  const periods = GROWTH_YEARS.length - 1;

  for (const [code, values] of Object.entries(FILE.entries)) {
    const first = values[0];
    const last = values[values.length - 1];
    if (first < MATERIALITY_FLOOR_USD_MN || last < MATERIALITY_FLOOR_USD_MN) continue;

    const line = lookupTariffLine(code);
    // A line DGCIS reports but DGFT's schedule does not is not something we can
    // send a reader to, so it is left out rather than linked to a 404.
    if (!line) continue;

    let upYears = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) upYears++;
    }

    rows.push({
      code,
      description: line.description,
      context: headingContext(code, line.description),
      href: `/export/${code}-${slugify(line.description)}`,
      values,
      firstUsdMn: first,
      latestUsdMn: last,
      cagrPct: Math.round((Math.pow(last / first, 1 / periods) - 1) * 1000) / 10,
      changeUsdMn: Math.round((last - first) * 10) / 10,
      upYears,
      totalSteps: periods,
    });
  }

  cache = rows;
  return rows;
}

/** Highest compound growth. */
export function fastestGrowing(limit = 25): GrowthRow[] {
  return [...growthTable()]
    .filter((r) => r.cagrPct > 0)
    .sort((a, b) => b.cagrPct - a.cagrPct)
    .slice(0, limit);
}

/** Most US$ added, which is a different question from the fastest rate. */
export function biggestGainers(limit = 25): GrowthRow[] {
  return [...growthTable()]
    .filter((r) => r.changeUsdMn > 0)
    .sort((a, b) => b.changeUsdMn - a.changeUsdMn)
    .slice(0, limit);
}

/**
 * Steepest decline.
 *
 * Included deliberately. A list of only the winners is a marketing asset; a
 * manufacturer deciding what to make needs to know which lines are going away,
 * and no free source publishes that either.
 */
export function fastestDeclining(limit = 25): GrowthRow[] {
  return [...growthTable()]
    .filter((r) => r.cagrPct < 0)
    .sort((a, b) => a.cagrPct - b.cagrPct)
    .slice(0, limit);
}

export function growthTableSize(): number {
  return growthTable().length;
}
