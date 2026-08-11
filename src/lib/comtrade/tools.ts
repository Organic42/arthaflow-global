/**
 * Saathi-callable trade intelligence tools.
 *
 * These are the "verbs" Saathi's tool-calling agent will invoke to answer
 * manufacturer questions. Each tool returns a structured result the LLM can
 * reason over PLUS a `narrative` string it can quote directly if useful.
 *
 * Design principle: never return raw Comtrade shape to the LLM.
 * Always translate to friendly shape (country names, USD millions, etc.).
 */

import { comtradeQuery, type ComtradeResult, type ComtradeRecord } from "./client";
import { findByM49, COUNTRIES } from "./countries";
import { witsIndiaExports } from "@/lib/wits/client";
import { isValidHsCode } from "@/lib/hs/classify";
import { dgcisIndiaExports, dgcisHasData } from "@/lib/hs/dgcis";

// ── Common shapes ────────────────────────────────────────────────────────────

export interface CountryValue {
  iso3: string;
  name: string;
  valueUsd: number;
  valueUsdM: number;   // Millions of USD, rounded
  sharePct: number;    // Share of total in the response
  rank: number;
}

export interface ToolError {
  ok: false;
  error: string;
  narrative: string;
}

export interface ToolSuccess<T> {
  ok: true;
  data: T;
  narrative: string;
  cached: boolean;
}

export type ToolResult<T> = ToolSuccess<T> | ToolError;

// ── Helpers ──────────────────────────────────────────────────────────────────

const usdM = (n: number) => Math.round((n / 1_000_000) * 10) / 10;

function toCountryValue(rec: ComtradeRecord, total: number, rank: number): CountryValue {
  return {
    iso3: rec.partnerISO,
    name: rec.partnerDesc,
    valueUsd: rec.primaryValue,
    valueUsdM: usdM(rec.primaryValue),
    sharePct: total > 0 ? Math.round((rec.primaryValue / total) * 1000) / 10 : 0,
    rank,
  };
}

function errorNarrative(res: Extract<ComtradeResult, { ok: false }>): string {
  switch (res.code) {
    case "NO_API_KEY":
      return "I could not fetch live trade data right now — the trade intelligence connection is not configured yet.";
    case "RATE_LIMITED":
      return "We are temporarily rate-limited on trade data. Please try again in a few minutes.";
    case "NO_DATA":
      return "I did not find any trade records for that query — the HS code or year may be too specific.";
    default:
      return "I was unable to retrieve trade data right now.";
  }
}

/**
 * Reject codes that don't exist in the nomenclature before spending an API
 * call on them. A bogus code otherwise returns NO_DATA, which reads as "no
 * trade happens here" rather than "that code isn't real".
 */
function badHsCode(hsCode: string): ToolError | null {
  if (isValidHsCode(hsCode)) return null;
  return {
    ok: false,
    error: `HS ${hsCode} is not a valid code.`,
    narrative:
      `HS ${hsCode} does not exist in the HS 2022 nomenclature. Call classifyProduct ` +
      `to find the right code for the product instead of guessing.`,
  };
}

function currentDataYear(): number {
  // Comtrade annual data lags: the most recent year is usually incomplete or
  // unpublished across most reporters. Year-minus-2 is the sweet spot where
  // broad multi-country coverage is reliably settled (verified: 2024 returns
  // data, 2025 does not, as of mid-2026).
  return new Date().getUTCFullYear() - 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 1 — Where can I sell this product?
// ═══════════════════════════════════════════════════════════════════════════

export interface GetTopImportersArgs {
  /** ITC-HS 2, 4, or 6-digit code (e.g. "8412" for hydraulic engines/motors). */
  hsCode: string;
  /** Year (default: last complete year). */
  year?: number;
  /** How many countries to return. Default 5. */
  limit?: number;
}

export interface TopImportersData {
  hsCode: string;
  year: number;
  totalWorldImportsUsd: number;
  totalWorldImportsUsdB: number; // Billions
  countries: CountryValue[];
}

/**
 * Get the top countries importing a given HS code globally.
 * Answers: "where can I export my product?"
 */
export async function getTopImporters(
  args: GetTopImportersArgs
): Promise<ToolResult<TopImportersData>> {
  const invalid = badHsCode(args.hsCode);
  if (invalid) return invalid;

  const year = args.year ?? currentDataYear();
  const limit = args.limit ?? 5;

  // reporterCode=0 (World) with flowCode=M returns all countries importing.
  // But Comtrade prefers we query with reporter as the importing country.
  // Approach: query reporterCode="all major" as CSV of top-40 M49 codes,
  // flowCode=M, cmdCode=hsCode, partnerCode=0 (from world).
  const majorReporterM49s = COUNTRIES.filter((c) => c.m49 > 0 && c.iso3 !== "IND")
    .map((c) => c.m49);

  const res = await comtradeQuery({
    reporterCode: majorReporterM49s,
    partnerCode: 0,     // From world
    cmdCode: args.hsCode,
    period: year,
    flowCode: "M",       // Imports
    maxRecords: 500,
  });

  if (!res.ok) {
    return { ok: false, error: res.message, narrative: errorNarrative(res) };
  }

  // Aggregate imports by reporter country (each country importing from world)
  const byReporter = new Map<number, ComtradeRecord>();
  for (const rec of res.data) {
    // Skip aggregate rows (reporter = 0)
    if (rec.reporterCode === 0) continue;
    const existing = byReporter.get(rec.reporterCode);
    if (!existing || rec.primaryValue > existing.primaryValue) {
      byReporter.set(rec.reporterCode, rec);
    }
  }

  // Convert to CountryValue array, rank by value
  const sorted = [...byReporter.values()].sort(
    (a, b) => b.primaryValue - a.primaryValue
  );

  const total = sorted.reduce((s, r) => s + r.primaryValue, 0);
  const top = sorted.slice(0, limit).map((rec, i) => {
    const country = findByM49(rec.reporterCode);
    return {
      iso3: country?.iso3 ?? rec.reporterISO,
      name: country?.name ?? rec.reporterDesc,
      valueUsd: rec.primaryValue,
      valueUsdM: usdM(rec.primaryValue),
      sharePct:
        total > 0 ? Math.round((rec.primaryValue / total) * 1000) / 10 : 0,
      rank: i + 1,
    };
  });

  const narrative =
    top.length === 0
      ? `I did not find import data for HS ${args.hsCode} in ${year}.`
      : `In ${year}, the top ${top.length} countries importing HS ${args.hsCode} globally were: ` +
        top
          .map((c, i) => `${i + 1}. ${c.name} ($${c.valueUsdM}M, ${c.sharePct}%)`)
          .join("; ") +
        ".";

  return {
    ok: true,
    cached: res.cached,
    narrative,
    data: {
      hsCode: args.hsCode,
      year,
      totalWorldImportsUsd: total,
      totalWorldImportsUsdB: Math.round((total / 1_000_000_000) * 10) / 10,
      countries: top,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 2 — India's exports of this product, and to whom
// ═══════════════════════════════════════════════════════════════════════════

export interface GetIndiaExportsArgs {
  hsCode: string;
  year?: number;
  limit?: number;
}

export interface IndiaExportsData {
  hsCode: string;
  year: number;
  totalIndiaExportsUsd: number;
  totalIndiaExportsUsdM: number;
  topDestinations: CountryValue[];
  /**
   * How the figures were derived:
   *  - "direct": India self-reported its exports to Comtrade.
   *  - "mirror": India did not report, so we summed what PARTNER countries
   *    reported importing FROM India ("mirror statistics"). Standard practice
   *    in trade analysis when a reporter's own filings are late or missing.
   *  - "wits": neither was available in Comtrade (its usual state for India),
   *    so figures come from the World Bank's WITS database at HS-chapter-group
   *    granularity — coarser than the requested HS code.
   *  - "dgcis": India's own customs statistics, vendored from the Department
   *    of Commerce TIA portal. Most authoritative and finest-grained source we
   *    have for India's exports, but a periodic manual snapshot rather than a
   *    live query — so it carries a financial year, not a calendar year.
   */
  source: "direct" | "mirror" | "wits" | "dgcis";
  /** Only set when source === "wits": the chapter group actually measured. */
  group?: string;
  groupLabel?: string;
  /** Only set when source === "dgcis": the financial year of the snapshot. */
  financialYear?: string;
  /** Only set when source === "dgcis": how many 8-digit lines were summed. */
  linesAggregated?: number;
}

const INDIA_M49 = 356;

/**
 * Mirror-statistics fallback: instead of asking India what it exported, ask
 * every major economy what it reported importing FROM India. Partner-reported
 * imports are the accepted proxy when a country reports late or not at all —
 * which is exactly India's pattern in Comtrade.
 *
 * Note the flow inversion: a country's IMPORT from India is an India EXPORT,
 * so the reporter of each row is the destination market.
 */
/**
 * India's own customs statistics (DGCIS), vendored from the Department of
 * Commerce TIA portal. Tried FIRST because it beats every other source we have
 * on this question: real Indian tariff lines rather than WITS chapter groups,
 * India's own filings rather than partner-reported mirror data, and a more
 * recent period than either.
 *
 * Returns null rather than a failed ToolResult so the caller simply falls
 * through to the live chain — an HS code missing from the snapshot is not an
 * error, it just means we have to ask Comtrade instead.
 */
function indiaExportsViaDgcis(
  hsCode: string,
  limit: number
): ToolResult<IndiaExportsData> | null {
  if (!dgcisHasData()) return null;

  const d = dgcisIndiaExports(hsCode, limit);
  if (!d) return null;

  const topDestinations: CountryValue[] = d.destinations.map((dest) => {
    const country = COUNTRIES.find((c) => c.iso3 === dest.iso3);
    return {
      iso3: dest.iso3,
      name: country?.name ?? dest.iso3,
      valueUsd: dest.valueUsd,
      valueUsdM: dest.valueUsdM,
      sharePct: dest.sharePct,
      rank: dest.rank,
    };
  });

  // Both caveats travel WITH the number rather than being left implicit: the
  // figure is a financial-year snapshot (not live), and where several tariff
  // lines sit under the requested prefix it spans all of them.
  const spread =
    d.linesAggregated > 1
      ? ` This covers all ${d.linesAggregated} Indian tariff lines under HS ${d.hsCode}.`
      : "";

  const narrative =
    `In FY ${d.financialYear}, India exported about $${d.totalUsdM}M of HS ${d.hsCode} ` +
    `(DGCIS, India's own customs data).${spread}` +
    (topDestinations.length
      ? ` Top destinations: ` +
        topDestinations
          .map((c) => `${c.name} ($${c.valueUsdM}M, ${c.sharePct}%)`)
          .join(", ") +
        "."
      : "");

  return {
    ok: true,
    cached: true, // vendored file, not a network call
    narrative,
    data: {
      hsCode: d.hsCode,
      // Financial years don't map onto a calendar year; carry the FY string in
      // its own field and take the opening year so `year` stays a number.
      year: Number(d.financialYear.slice(0, 4)) || new Date().getUTCFullYear(),
      totalIndiaExportsUsd: d.totalUsd,
      totalIndiaExportsUsdM: d.totalUsdM,
      topDestinations,
      source: "dgcis",
      financialYear: d.financialYear,
      linesAggregated: d.linesAggregated,
    },
  };
}

/**
 * Last resort: the World Bank's WITS database, which (unlike Comtrade) does
 * carry India. Coarser products — HS chapter groups rather than the exact
 * code — so the narrative says so explicitly.
 */
async function indiaExportsViaWits(
  hsCode: string,
  year: number | undefined,
  limit: number
): Promise<ToolResult<IndiaExportsData>> {
  const res = await witsIndiaExports({ hsCode, year, limit });
  if (!res.ok) {
    return { ok: false, error: res.error, narrative: res.narrative };
  }
  return {
    ok: true,
    cached: res.cached,
    narrative: res.narrative,
    data: {
      hsCode,
      year: res.data.year,
      totalIndiaExportsUsd: res.data.totalUsd,
      totalIndiaExportsUsdM: res.data.totalUsdM,
      topDestinations: res.data.destinations,
      source: "wits",
      group: res.data.group,
      groupLabel: res.data.groupLabel,
    },
  };
}

async function indiaExportsViaMirror(
  hsCode: string,
  year: number,
  limit: number,
  requestedYear: number | undefined
): Promise<ToolResult<IndiaExportsData>> {
  const reporters = COUNTRIES.filter(
    (c) => c.m49 > 0 && c.m49 !== INDIA_M49
  ).map((c) => c.m49);

  const res = await comtradeQuery({
    reporterCode: reporters,
    partnerCode: INDIA_M49, // ...imported FROM India
    cmdCode: hsCode,
    period: year,
    flowCode: "M",          // Their imports = India's exports
    maxRecords: 500,
  });

  // Partners don't report India either (Comtrade's usual state) → WITS.
  // Fall through on ANY failure, not just NO_DATA: a rate limit or upstream
  // blip on Comtrade shouldn't deny the user data that WITS can serve.
  if (!res.ok) {
    return indiaExportsViaWits(hsCode, requestedYear, limit);
  }

  // One aggregated row per reporting (destination) country.
  const byReporter = new Map<number, ComtradeRecord>();
  for (const rec of res.data) {
    if (rec.reporterCode === 0) continue;
    const existing = byReporter.get(rec.reporterCode);
    if (!existing || rec.primaryValue > existing.primaryValue) {
      byReporter.set(rec.reporterCode, rec);
    }
  }

  const sorted = [...byReporter.values()].sort(
    (a, b) => b.primaryValue - a.primaryValue
  );
  const total = sorted.reduce((s, r) => s + r.primaryValue, 0);

  if (total === 0) {
    return indiaExportsViaWits(hsCode, requestedYear, limit);
  }

  const top = sorted.slice(0, limit).map((rec, i) => {
    const country = findByM49(rec.reporterCode);
    return {
      iso3: country?.iso3 ?? rec.reporterISO,
      name: country?.name ?? rec.reporterDesc,
      valueUsd: rec.primaryValue,
      valueUsdM: usdM(rec.primaryValue),
      sharePct:
        total > 0 ? Math.round((rec.primaryValue / total) * 1000) / 10 : 0,
      rank: i + 1,
    };
  });

  const narrative =
    `Based on partner-country reports (mirror data, used because India's own ` +
    `filings for this period are unavailable), buyers imported about ` +
    `$${usdM(total)}M of HS ${hsCode} from India in ${year}. Top destinations: ` +
    top.map((c) => `${c.name} ($${c.valueUsdM}M, ${c.sharePct}%)`).join(", ") +
    ".";

  return {
    ok: true,
    cached: res.cached,
    narrative,
    data: {
      hsCode,
      year,
      totalIndiaExportsUsd: total,
      totalIndiaExportsUsdM: usdM(total),
      topDestinations: top,
      source: "mirror",
    },
  };
}

/**
 * Get India's exports of a given HS code, broken down by destination country.
 * Answers: "how much of X does India export, and to whom?"
 *
 * Strategy: try India's own filings first (most authoritative). India reports
 * to Comtrade late and sparsely, so when that comes back empty we fall back to
 * mirror statistics — what partner countries reported importing from India.
 */
export async function getIndiaExports(
  args: GetIndiaExportsArgs
): Promise<ToolResult<IndiaExportsData>> {
  const invalid = badHsCode(args.hsCode);
  if (invalid) return invalid;

  const year = args.year ?? currentDataYear();
  const limit = args.limit ?? 5;

  // India's own customs data first — see indiaExportsViaDgcis. Skipped when the
  // caller pinned a specific year, since the snapshot only holds one financial
  // year and silently answering about a different period would be worse than
  // falling through to a source that can honour the request.
  if (!args.year) {
    const dgcis = indiaExportsViaDgcis(args.hsCode, limit);
    if (dgcis) return dgcis;
  }

  // NOTE: partnerCode 0 is Comtrade's "World" aggregate, so this establishes
  // whether India reported at all. It cannot yield a per-destination
  // breakdown (that needs the partner dimension expanded) — but India has no
  // Comtrade data whatsoever today, so in practice this always falls through
  // to the mirror and then to WITS, which is where destinations come from.
  const res = await comtradeQuery({
    reporterCode: INDIA_M49,
    partnerCode: 0,
    cmdCode: args.hsCode,
    period: year,
    flowCode: "X",       // Exports
    maxRecords: 500,
  });

  // India didn't report (the common case) → mirror, and on to WITS from there.
  // Any failure falls through; the chain's job is to find data somewhere.
  if (!res.ok) {
    return indiaExportsViaMirror(args.hsCode, year, limit, args.year);
  }

  // Get "India → World" total (partnerCode=0 aggregate) and per-partner rows
  const worldTotal = res.data.find((r) => r.partnerCode === 0);
  const perPartner = res.data
    .filter((r) => r.partnerCode !== 0)
    .sort((a, b) => b.primaryValue - a.primaryValue);

  const total = worldTotal?.primaryValue ?? perPartner.reduce((s, r) => s + r.primaryValue, 0);

  // Rows came back but carry no value — mirror is still the better answer.
  if (total === 0) {
    return indiaExportsViaMirror(args.hsCode, year, limit, args.year);
  }

  const top = perPartner.slice(0, limit).map((rec, i) => toCountryValue(rec, total, i + 1));

  const narrative =
    `In ${year}, India exported $${usdM(total)}M of HS ${args.hsCode} globally. ` +
    (top.length
      ? `Top destinations: ` +
        top.map((c) => `${c.name} ($${c.valueUsdM}M, ${c.sharePct}%)`).join(", ")
      : "");

  return {
    ok: true,
    cached: res.cached,
    narrative,
    data: {
      hsCode: args.hsCode,
      year,
      totalIndiaExportsUsd: total,
      totalIndiaExportsUsdM: usdM(total),
      topDestinations: top,
      source: "direct",
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 3 — Who competes with India in exporting this product?
// ═══════════════════════════════════════════════════════════════════════════

export interface GetTopExportersArgs {
  hsCode: string;
  year?: number;
  limit?: number;
  includeIndia?: boolean;
}

export interface TopExportersData {
  hsCode: string;
  year: number;
  totalWorldExportsUsd: number;
  totalWorldExportsUsdB: number;
  exporters: CountryValue[];
}

/**
 * Get top countries exporting a given HS code — India's competition.
 */
export async function getTopExporters(
  args: GetTopExportersArgs
): Promise<ToolResult<TopExportersData>> {
  const invalid = badHsCode(args.hsCode);
  if (invalid) return invalid;

  const year = args.year ?? currentDataYear();
  const limit = args.limit ?? 5;

  const majorReporterM49s = COUNTRIES.filter((c) => c.m49 > 0).map((c) => c.m49);

  const res = await comtradeQuery({
    reporterCode: majorReporterM49s,
    partnerCode: 0,       // To world
    cmdCode: args.hsCode,
    period: year,
    flowCode: "X",         // Exports
    maxRecords: 500,
  });

  if (!res.ok) {
    return { ok: false, error: res.message, narrative: errorNarrative(res) };
  }

  const byReporter = new Map<number, ComtradeRecord>();
  for (const rec of res.data) {
    if (rec.reporterCode === 0) continue;
    const existing = byReporter.get(rec.reporterCode);
    if (!existing || rec.primaryValue > existing.primaryValue) {
      byReporter.set(rec.reporterCode, rec);
    }
  }

  const sorted = [...byReporter.values()]
    .filter((r) => args.includeIndia !== false || r.reporterCode !== 356)
    .sort((a, b) => b.primaryValue - a.primaryValue);

  const total = sorted.reduce((s, r) => s + r.primaryValue, 0);
  const top = sorted.slice(0, limit).map((rec, i) => {
    const country = findByM49(rec.reporterCode);
    return {
      iso3: country?.iso3 ?? rec.reporterISO,
      name: country?.name ?? rec.reporterDesc,
      valueUsd: rec.primaryValue,
      valueUsdM: usdM(rec.primaryValue),
      sharePct:
        total > 0 ? Math.round((rec.primaryValue / total) * 1000) / 10 : 0,
      rank: i + 1,
    };
  });

  const narrative =
    top.length === 0
      ? `I did not find export data for HS ${args.hsCode} in ${year}.`
      : `In ${year}, the top ${top.length} exporters of HS ${args.hsCode} globally were: ` +
        top
          .map((c) => `${c.name} ($${c.valueUsdM}M, ${c.sharePct}%)`)
          .join(", ") +
        ".";

  return {
    ok: true,
    cached: res.cached,
    narrative,
    data: {
      hsCode: args.hsCode,
      year,
      totalWorldExportsUsd: total,
      totalWorldExportsUsdB: Math.round((total / 1_000_000_000) * 10) / 10,
      exporters: top,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL 4 — Trade trend for a specific reporter-partner-product triple
// ═══════════════════════════════════════════════════════════════════════════

export interface GetTradeTrendArgs {
  hsCode: string;
  reporterIso: string; // e.g. "DEU" — the country whose trade we're tracking
  /**
   * Optional counterparty, e.g. "IND". Omit (or pass "WLD") to trend the
   * reporter's TOTAL trade with the world — i.e. overall market demand, which
   * is usually what a manufacturer actually wants to know ("is demand for my
   * product growing in Germany?") and is far better covered in the data than
   * any single bilateral pair.
   */
  partnerIso?: string;
  years?: number;      // How many recent years. Default 5.
  flow?: "X" | "M";
}

export interface TradeTrendPoint {
  year: number;
  valueUsd: number;
  valueUsdM: number;
  growthPct: number | null; // Year-over-year %
}

export interface TradeTrendData {
  hsCode: string;
  reporter: string;
  partner: string;
  flow: "X" | "M";
  points: TradeTrendPoint[];
  totalGrowthPct: number | null;
  cagr: number | null;
}

export async function getTradeTrend(
  args: GetTradeTrendArgs
): Promise<ToolResult<TradeTrendData>> {
  const invalid = badHsCode(args.hsCode);
  if (invalid) return invalid;

  const { COUNTRIES: _c } = await import("./countries");
  const reporter = _c.find((c) => c.iso3 === args.reporterIso.toUpperCase());
  if (!reporter) {
    return {
      ok: false,
      error: "Unknown country code",
      narrative: `I could not resolve that country. Use ISO-3 codes like IND, USA, DEU.`,
    };
  }

  // No partner (or explicit "WLD") → trend against the whole world.
  const wantsWorld =
    !args.partnerIso ||
    ["WLD", "WORLD", "ALL"].includes(args.partnerIso.toUpperCase());
  const partner = wantsWorld
    ? null
    : _c.find((c) => c.iso3 === args.partnerIso!.toUpperCase());
  if (!wantsWorld && !partner) {
    return {
      ok: false,
      error: "Unknown country code",
      narrative: `I could not resolve that partner country. Use ISO-3 codes like IND, USA, DEU — or omit it to see total market demand.`,
    };
  }
  const partnerName = partner ? partner.name : "World";

  const yearsBack = args.years ?? 5;
  const endYear = currentDataYear();
  const years = Array.from({ length: yearsBack }, (_, i) => endYear - i);

  const res = await comtradeQuery({
    reporterCode: reporter.m49,
    partnerCode: partner ? partner.m49 : 0,
    cmdCode: args.hsCode,
    period: years,
    flowCode: args.flow ?? "X",
  });

  if (!res.ok) {
    return { ok: false, error: res.message, narrative: errorNarrative(res) };
  }

  const byYear = new Map<number, number>();
  for (const rec of res.data) {
    const y = Number(rec.period);
    byYear.set(y, (byYear.get(y) ?? 0) + rec.primaryValue);
  }

  const points: TradeTrendPoint[] = years
    .slice()
    .reverse()
    .map((y, i, arr) => {
      const v = byYear.get(y) ?? 0;
      const prev = i > 0 ? (byYear.get(arr[i - 1]) ?? 0) : 0;
      return {
        year: y,
        valueUsd: v,
        valueUsdM: usdM(v),
        growthPct: prev > 0 ? Math.round(((v - prev) / prev) * 1000) / 10 : null,
      };
    });

  const first = points[0]?.valueUsd ?? 0;
  const last = points[points.length - 1]?.valueUsd ?? 0;
  const totalGrowthPct =
    first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : null;
  const cagr =
    first > 0 && points.length > 1
      ? Math.round((Math.pow(last / first, 1 / (points.length - 1)) - 1) * 1000) / 10
      : null;

  const flowWord = (args.flow ?? "X") === "M" ? "imports of" : "exports of";
  const label = wantsWorld
    ? `${reporter.name} total ${flowWord} HS ${args.hsCode}`
    : `${reporter.name} → ${partnerName}, HS ${args.hsCode}`;

  const narrative =
    points.length === 0
      ? `I did not find trade trend data for HS ${args.hsCode} for ${reporter.name}${
          wantsWorld ? "" : ` with ${partnerName}`
        }.`
      : `${label}: ` +
        points.map((p) => `${p.year}: $${p.valueUsdM}M`).join(", ") +
        (totalGrowthPct !== null ? ` (${totalGrowthPct}% total growth)` : "");

  return {
    ok: true,
    cached: res.cached,
    narrative,
    data: {
      hsCode: args.hsCode,
      reporter: reporter.name,
      partner: partnerName,
      flow: args.flow ?? "X",
      points,
      totalGrowthPct,
      cagr,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL SCHEMAS — used by the Saathi agent to describe tools to the LLM
// ═══════════════════════════════════════════════════════════════════════════

export const TRADE_TOOLS = [
  {
    name: "getTopImporters",
    description:
      "Get the top countries importing a given HS code globally. Answers: where can I export my product?",
    parameters: {
      type: "object",
      properties: {
        hsCode: {
          type: "string",
          description: "ITC-HS code (2, 4, or 6 digit), e.g. '8412'.",
        },
        year: { type: "number", description: "Optional. Default: last complete year." },
        limit: { type: "number", description: "Optional. Default 5." },
      },
      required: ["hsCode"],
    },
  },
  {
    name: "getIndiaExports",
    description:
      "Get India's total exports of an HS code and the top destination countries. Answers: how much does India export of X and to whom? Falls back automatically to mirror statistics (what partner countries report importing from India) when India's own filings are missing — the result's `source` field says which was used.",
    parameters: {
      type: "object",
      properties: {
        hsCode: { type: "string" },
        year: { type: "number" },
        limit: { type: "number" },
      },
      required: ["hsCode"],
    },
  },
  {
    name: "getTopExporters",
    description:
      "Get top countries exporting a given HS code — India's competition. Answers: who competes with India in X?",
    parameters: {
      type: "object",
      properties: {
        hsCode: { type: "string" },
        year: { type: "number" },
        limit: { type: "number" },
        includeIndia: { type: "boolean" },
      },
      required: ["hsCode"],
    },
  },
  {
    name: "getTradeTrend",
    description:
      "Get a multi-year trade trend for an HS code. Best use: market demand growth — set reporterIso to the MARKET you care about with flow='M' and NO partnerIso, e.g. 'is demand for my product growing in Germany?' → reporterIso='DEU', flow='M'. Optionally pass partnerIso for a specific bilateral pair.",
    parameters: {
      type: "object",
      properties: {
        hsCode: { type: "string" },
        reporterIso: {
          type: "string",
          description:
            "ISO-3 code of the country whose trade to track. For market-demand questions this is the destination market, e.g. 'DEU', 'USA'.",
        },
        partnerIso: {
          type: "string",
          description:
            "OPTIONAL counterparty ISO-3. Omit it to trend total trade with the world (recommended — much better data coverage than any single bilateral pair).",
        },
        years: { type: "number", description: "How many recent years. Default 5." },
        flow: {
          type: "string",
          enum: ["X", "M"],
          description:
            "M = the reporter's imports (use for market demand), X = the reporter's exports. Default X.",
        },
      },
      required: ["hsCode", "reporterIso"],
    },
  },
] as const;
