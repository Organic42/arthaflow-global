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

function currentDataYear(): number {
  // Comtrade lags ~6-12 months; safest default is the year before last.
  return new Date().getUTCFullYear() - 1;
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
}

/**
 * Get India's exports of a given HS code, broken down by destination country.
 * Answers: "how much of X does India export, and to whom?"
 */
export async function getIndiaExports(
  args: GetIndiaExportsArgs
): Promise<ToolResult<IndiaExportsData>> {
  const year = args.year ?? currentDataYear();
  const limit = args.limit ?? 5;

  const res = await comtradeQuery({
    reporterCode: 356, // India
    partnerCode: 0,     // All partners
    cmdCode: args.hsCode,
    period: year,
    flowCode: "X",       // Exports
    maxRecords: 500,
  });

  if (!res.ok) {
    return { ok: false, error: res.message, narrative: errorNarrative(res) };
  }

  // Get "India → World" total (partnerCode=0 aggregate) and per-partner rows
  const worldTotal = res.data.find((r) => r.partnerCode === 0);
  const perPartner = res.data
    .filter((r) => r.partnerCode !== 0)
    .sort((a, b) => b.primaryValue - a.primaryValue);

  const total = worldTotal?.primaryValue ?? perPartner.reduce((s, r) => s + r.primaryValue, 0);

  const top = perPartner.slice(0, limit).map((rec, i) => toCountryValue(rec, total, i + 1));

  const narrative =
    total === 0
      ? `India did not export any HS ${args.hsCode} in ${year}.`
      : `In ${year}, India exported $${usdM(total)}M of HS ${args.hsCode} globally. ` +
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
  reporterIso: string; // e.g. "IND"
  partnerIso: string;  // e.g. "DEU"
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
  const { COUNTRIES: _c } = await import("./countries");
  const reporter = _c.find((c) => c.iso3 === args.reporterIso.toUpperCase());
  const partner = _c.find((c) => c.iso3 === args.partnerIso.toUpperCase());
  if (!reporter || !partner) {
    return {
      ok: false,
      error: "Unknown country code",
      narrative: `I could not resolve one of those countries. Use ISO-3 codes like IND, USA, DEU.`,
    };
  }

  const yearsBack = args.years ?? 5;
  const endYear = currentDataYear();
  const years = Array.from({ length: yearsBack }, (_, i) => endYear - i);

  const res = await comtradeQuery({
    reporterCode: reporter.m49,
    partnerCode: partner.m49,
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

  const narrative =
    points.length === 0
      ? `I did not find trade trend data for HS ${args.hsCode} between ${reporter.name} and ${partner.name}.`
      : `${reporter.name} → ${partner.name}, HS ${args.hsCode}: ` +
        points.map((p) => `${p.year}: $${p.valueUsdM}M`).join(", ") +
        (totalGrowthPct !== null ? ` (${totalGrowthPct}% total growth)` : "");

  return {
    ok: true,
    cached: res.cached,
    narrative,
    data: {
      hsCode: args.hsCode,
      reporter: reporter.name,
      partner: partner.name,
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
      "Get India's total exports of an HS code and the top destination countries. Answers: how much does India export of X and to whom?",
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
      "Get multi-year trade flow between a specific reporter (exporter) and partner (importer) for a given HS code. Answers: how has demand grown?",
    parameters: {
      type: "object",
      properties: {
        hsCode: { type: "string" },
        reporterIso: {
          type: "string",
          description: "ISO-3 code of the exporting country. Usually 'IND'.",
        },
        partnerIso: {
          type: "string",
          description: "ISO-3 code of the importing country. E.g. 'DEU', 'USA'.",
        },
        years: { type: "number", description: "How many recent years. Default 5." },
        flow: {
          type: "string",
          enum: ["X", "M"],
          description: "X = exports (default), M = imports.",
        },
      },
      required: ["hsCode", "reporterIso", "partnerIso"],
    },
  },
] as const;
