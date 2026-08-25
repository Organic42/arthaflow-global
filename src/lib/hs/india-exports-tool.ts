import {
  indiaExportsFor,
  describeIndiaExports,
  formatUsdMn,
  INDIA_EXPORTS_SOURCE,
  type IndiaExportSeries,
} from "./india-exports";

/**
 * Saathi's access to India's own export statistics.
 *
 * WHY THIS IS A SEPARATE TOOL FROM getIndiaExports
 * getIndiaExports answers "which countries buy this from India" and reaches
 * over the network to DGCIS, a Comtrade mirror or World Bank WITS, any of
 * which can fail or return a year old. This one answers "how much does India
 * sell of this, and is it growing", resolves synchronously from a vendored
 * file, and covers seven financial years — but has no destination dimension at
 * all. Two different questions from two different sources, so two tools. The
 * model must not be able to answer one with the other, which is why the
 * narrative below closes every reply by saying what it does not know.
 *
 * WHY THE MODEL NEEDS IT
 * Everything else Saathi can reach describes RULES — duty, rebate, policy.
 * Nothing told it whether a trade actually exists. A manufacturer asking "is
 * this worth exporting" was being answered from tariff rates alone, which is
 * the wrong evidence for that question.
 */

export type IndiaExportsToolResult =
  | { ok: true; data: SeriesPayload; narrative: string; cached: boolean }
  | { ok: false; error: string; narrative: string };

interface SeriesPayload {
  hsCode: string;
  financialYears: string[];
  valuesUsdMn: number[];
  latestUsdMn: number;
  latestYear: string;
  growthPct: number | null;
  /** Compound annual growth across the whole series, where it is meaningful. */
  cagrPct: number | null;
  linesAggregated: number;
  source: string;
}

/**
 * Compound annual growth over the full series.
 *
 * Null when the first year is zero — a rate out of nothing is infinite, and a
 * line that started at zero is better described by its absolute numbers than
 * by a percentage nobody can act on.
 */
function cagr(values: number[]): number | null {
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  if (first <= 0 || last <= 0) return null;
  const periods = values.length - 1;
  return Math.round((Math.pow(last / first, 1 / periods) - 1) * 1000) / 10;
}

export function getIndiaExportVolume(args: { hsCode?: string }): IndiaExportsToolResult {
  const raw = String(args?.hsCode ?? "").replace(/\D/g, "");
  if (![2, 4, 6, 8].includes(raw.length)) {
    return {
      ok: false,
      error: "Need a 2, 4, 6 or 8 digit HS code.",
      narrative:
        "TOOL_ERROR: I need an HS code of 2, 4, 6 or 8 digits. Classify the product first.",
    };
  }

  const series: IndiaExportSeries | null = indiaExportsFor(raw);
  if (!series) {
    return {
      ok: false,
      error: "No DGCIS export record for that code.",
      narrative:
        `TOOL_ERROR: DGCIS reports no export value under HS ${raw}. That may mean India ` +
        `does not ship this line, or that it is recorded under a neighbouring code. Say ` +
        `so plainly. Do NOT estimate a figure.`,
    };
  }

  const growth = describeIndiaExports(series);
  const rate = cagr(series.valuesUsdMn);
  const span = `${series.financialYears[0]} to ${series.latestYear}`;

  const trend =
    rate === null
      ? ""
      : ` Across ${span} that is ${rate >= 0 ? "growth" : "decline"} of ${Math.abs(rate)}% a year compounded.`;

  const history = series.financialYears
    .map((y, i) => `FY${y} ${formatUsdMn(series.valuesUsdMn[i])}`)
    .join(", ");

  return {
    ok: true,
    cached: true, // served from bundled data; no upstream call
    data: {
      hsCode: series.prefix,
      financialYears: series.financialYears,
      valuesUsdMn: series.valuesUsdMn,
      latestUsdMn: series.latestUsdMn,
      latestYear: series.latestYear,
      growthPct: series.growthPct,
      cagrPct: rate,
      linesAggregated: series.linesAggregated,
      source: INDIA_EXPORTS_SOURCE.name,
    },
    narrative:
      `${growth}${trend} Full series: ${history}. Source: ${INDIA_EXPORTS_SOURCE.name}. ` +
      `MANDATORY: this figure is what India SELLS of this line. It carries no destination ` +
      `breakdown — you MUST NOT present it as exports to any particular country, and if the ` +
      `user asked where their product sells, say you have the national total and call ` +
      `getIndiaExports for destinations.`,
  };
}

export const INDIA_EXPORT_TOOLS = [
  {
    name: "getIndiaExportVolume",
    description:
      "How much India exports of a product each year, from India's own DGCIS customs statistics — seven financial years of history with growth rates. Use this to answer whether a product is actually traded, whether the market is growing or shrinking, or how big the opportunity is. This is the NATIONAL total and carries NO destination breakdown; call getIndiaExports instead when the user asks which countries buy it. Accepts 2, 4, 6 or 8 digits and sums every tariff line beneath a shorter code.",
    parameters: {
      type: "object",
      properties: {
        hsCode: {
          type: "string",
          description:
            "HS code of 2, 4, 6 or 8 digits, normally the one classifyProduct just resolved.",
        },
      },
      required: ["hsCode"],
    },
  },
];
