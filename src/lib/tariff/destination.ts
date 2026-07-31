/**
 * Import duty a DESTINATION country charges on an Indian product.
 *
 * This is the number that decides whether an export is worth making. A Pune
 * manufacturer shipping leather bags to Germany does not care what India's
 * customs duty is — they care that Germany charges 3% and Turkey charges 33%,
 * because that is what lands in the buyer's price.
 *
 * Competitors show India's own import duty (BCD, IGST). That serves an importer,
 * not an exporter, and is why we do not build it.
 *
 * SOURCE
 * UNCTAD TRAINS via the World Bank's WITS SDMX API — the same service already
 * used for India's export figures, different datasource. Rates are effectively
 * applied MFN, simple average across the tariff lines under a 6-digit heading.
 *
 * WHAT THIS IS NOT
 * Not a landed cost. MFN is the rate before any trade agreement, and an FTA can
 * take it to zero — India has agreements with the UAE, Japan, Korea, ASEAN and
 * others. TRAINS returned no preferential lines for the India pairs we tested,
 * so we report MFN and say plainly that a preference may apply. Quoting MFN as
 * "the duty" would overstate the cost for exactly the corridors we push people
 * towards.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { agreementFor, describeAgreement } from "./fta";

const BASE = "https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN";

/**
 * WITS reporter codes.
 *
 * NOT interchangeable with the M49 codes in comtrade/countries.ts. WITS wants
 * 840 for the United States where Comtrade uses 842, and rejects ISO-3 codes
 * outright. Every code here was verified against a live query returning a real
 * rate — guessing produced silent "no data" rather than an error.
 *
 * Belgium, Australia, Brazil and Bangladesh are deliberately absent: TRAINS
 * held no rate for them in any year we probed, and an absent country yields an
 * honest "no data" rather than a wrong number.
 */
export const WITS_REPORTERS: Record<string, { code: number; name: string }> = {
  ARE: { code: 784, name: "United Arab Emirates" },
  ARG: { code: 32, name: "Argentina" },
  BGR: { code: 100, name: "Bulgaria" },
  CAN: { code: 124, name: "Canada" },
  CHL: { code: 152, name: "Chile" },
  CHN: { code: 156, name: "China" },
  COL: { code: 170, name: "Colombia" },
  CZE: { code: 203, name: "Czechia" },
  DEU: { code: 276, name: "Germany" },
  DNK: { code: 208, name: "Denmark" },
  ECU: { code: 218, name: "Ecuador" },
  EGY: { code: 818, name: "Egypt" },
  ESP: { code: 724, name: "Spain" },
  ETH: { code: 231, name: "Ethiopia" },
  FRA: { code: 250, name: "France" },
  GBR: { code: 826, name: "United Kingdom" },
  HKG: { code: 344, name: "Hong Kong SAR" },
  IDN: { code: 360, name: "Indonesia" },
  IND: { code: 356, name: "India" },
  IRL: { code: 372, name: "Ireland" },
  ITA: { code: 380, name: "Italy" },
  JOR: { code: 400, name: "Jordan" },
  JPN: { code: 392, name: "Japan" },
  KEN: { code: 404, name: "Kenya" },
  KOR: { code: 410, name: "Korea, Rep." },
  KWT: { code: 414, name: "Kuwait" },
  MEX: { code: 484, name: "Mexico" },
  MYS: { code: 458, name: "Malaysia" },
  NGA: { code: 566, name: "Nigeria" },
  NLD: { code: 528, name: "Netherlands" },
  OMN: { code: 512, name: "Oman" },
  PER: { code: 604, name: "Peru" },
  POL: { code: 616, name: "Poland" },
  PRT: { code: 620, name: "Portugal" },
  QAT: { code: 634, name: "Qatar" },
  SAU: { code: 682, name: "Saudi Arabia" },
  SGP: { code: 702, name: "Singapore" },
  SWE: { code: 752, name: "Sweden" },
  THA: { code: 764, name: "Thailand" },
  TUR: { code: 792, name: "Türkiye" },
  TWN: { code: 158, name: "Taiwan" },
  USA: { code: 840, name: "United States" },
  VNM: { code: 704, name: "Viet Nam" },
  ZAF: { code: 710, name: "South Africa" },
};

/**
 * Years to try, newest first. TRAINS coverage is uneven — Egypt's most recent
 * rate is 2019 — so a single year would report "no data" for countries that
 * have a perfectly good older rate.
 */
const YEARS = [2023, 2022, 2021, 2020, 2019];

export interface DestinationDuty {
  /** ISO-3 of the importing country. */
  iso3: string;
  /** Human name, as we will show it. */
  country: string;
  /** 6-digit HS code the rate applies to. */
  hsCode: string;
  /** Effectively applied MFN rate, simple average across lines. */
  mfnRatePct: number;
  /** Lowest and highest line rates under the heading, when they differ. */
  minRatePct: number | null;
  maxRatePct: number | null;
  /** Year the rate was reported for. */
  year: number;
  /** How many tariff lines sit under this heading. */
  lineCount: number | null;
}

export type DestinationDutyResult =
  | { ok: true; data: DestinationDuty; narrative: string; cached: boolean }
  | { ok: false; error: string; narrative: string };

// ── Cache (reuses the trade_cache table) ─────────────────────────────────────

async function readCache(key: string): Promise<DestinationDuty | null> {
  try {
    const supabase = createAdminClient();
    if (!supabase) return null;
    const { data } = await supabase
      .from("trade_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return data.payload as DestinationDuty;
  } catch {
    return null;
  }
}

async function writeCache(key: string, payload: DestinationDuty) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return;
    const expires = new Date();
    // Tariff schedules move once a year at most, so this can sit far longer
    // than trade statistics.
    expires.setDate(expires.getDate() + 90);
    await supabase
      .from("trade_cache")
      .upsert(
        { cache_key: key, payload, expires_at: expires.toISOString() },
        { onConflict: "cache_key" }
      );
  } catch {
    // Non-fatal — caching is an optimisation, not a dependency.
  }
}

// ── Parsing ──────────────────────────────────────────────────────────────────

interface ParsedObs {
  value: number;
  tariffType: string;
  min: number | null;
  max: number | null;
  lines: number | null;
}

/**
 * Pull the observation out of the SDMX payload.
 *
 * The document is a single `<Series ...><Obs OBS_VALUE="3" TARIFFTYPE="MFN"
 * MIN_RATE="3" MAX_RATE="3" TOTALNOOFLINES="1" /></Series>`.
 */
function parseObs(xml: string): ParsedObs | null {
  const m = /<Obs\b([^>]*)\/>/.exec(xml);
  if (!m) return null;
  const attrs = m[1];
  const attr = (name: string): string | null => {
    const a = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
    return a ? a[1] : null;
  };
  const num = (name: string): number | null => {
    const v = attr(name);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const value = num("OBS_VALUE");
  if (value === null) return null;

  return {
    value,
    tariffType: attr("TARIFFTYPE") ?? "MFN",
    min: num("MIN_RATE"),
    max: num("MAX_RATE"),
    lines: num("TOTALNOOFLINES"),
  };
}

// ── Query ────────────────────────────────────────────────────────────────────

export interface DestinationDutyArgs {
  /** ISO-3 of the importing country, e.g. "DEU". */
  destinationIso: string;
  /** 6-digit HS code. 8-digit input is truncated — TRAINS speaks HS 6. */
  hsCode: string;
}

/**
 * Fetch the MFN duty a destination charges on a product.
 *
 * Walks back through years until one has data, because TRAINS coverage is
 * uneven and a missing recent year does not mean a missing rate.
 */
export async function destinationDuty(
  args: DestinationDutyArgs
): Promise<DestinationDutyResult> {
  const iso = String(args?.destinationIso ?? "").trim().toUpperCase();
  const hsCode = String(args?.hsCode ?? "").replace(/\D/g, "").slice(0, 6);

  if (hsCode.length !== 6) {
    return {
      ok: false,
      error: "Need a 6-digit HS code.",
      narrative:
        "I need the 6-digit HS code to look up an import duty — classify the product first.",
    };
  }

  const reporter = WITS_REPORTERS[iso];
  if (!reporter) {
    return {
      ok: false,
      error: `No tariff data for ${iso}.`,
      narrative:
        `TOOL_ERROR: we hold no import-duty data for "${iso}". Tell the user plainly that ` +
        `the duty for that destination is unavailable. Do NOT estimate it, and do NOT ` +
        `substitute another country's rate.`,
    };
  }

  const cacheKey = `trn:${reporter.code}:${hsCode}`;
  const cached = await readCache(cacheKey);
  if (cached) {
    return { ok: true, data: cached, narrative: describe(cached), cached: true };
  }

  for (const year of YEARS) {
    const url =
      `${BASE}/reporter/${reporter.code}/partner/000/product/${hsCode}` +
      `/year/${year}/datatype/reported`;

    let xml: string;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/xml" },
        signal: AbortSignal.timeout(20_000),
      });
      // 404 here means "no records for this year", not a broken request.
      if (!res.ok) continue;
      xml = await res.text();
    } catch {
      continue;
    }

    const obs = parseObs(xml);
    if (!obs) continue;

    const data: DestinationDuty = {
      iso3: iso,
      country: reporter.name,
      hsCode,
      mfnRatePct: Math.round(obs.value * 100) / 100,
      minRatePct: obs.min,
      maxRatePct: obs.max,
      year,
      lineCount: obs.lines,
    };

    await writeCache(cacheKey, data);
    return { ok: true, data, narrative: describe(data), cached: false };
  }

  return {
    ok: false,
    error: "No tariff record.",
    narrative:
      `TOOL_ERROR: UNCTAD TRAINS holds no import duty for HS ${hsCode} into ` +
      `${reporter.name}. Say the duty is unavailable for that product and destination. ` +
      `Do NOT estimate it.`,
  };
}

/**
 * The sentence a caller shows, with the FTA caveat attached.
 *
 * Where an agreement is in force the MFN figure is an OVERSTATEMENT of what the
 * buyer pays, so the agreement note is appended rather than left for the model
 * to remember.
 */
export function describe(d: DestinationDuty): string {
  const spread =
    d.minRatePct !== null &&
    d.maxRatePct !== null &&
    d.minRatePct !== d.maxRatePct
      ? ` (lines range ${d.minRatePct}%–${d.maxRatePct}%)`
      : "";

  const fta = agreementFor(d.iso3);

  let s =
    `${d.country} applies an MFN import duty of ${d.mfnRatePct}% on HS ${d.hsCode}${spread}, ` +
    `reported for ${d.year} (UNCTAD TRAINS via World Bank WITS). ` +
    `MANDATORY: this is the MFN rate, charged before any trade agreement. ` +
    `Never present this as the landed cost. `;

  if (fta) {
    s += describeAgreement(fta, d.mfnRatePct);
  } else {
    s +=
      `We hold no trade agreement covering ${d.country} for Indian goods, so the MFN rate ` +
      `is most likely what applies. Say the buyer's customs broker should still confirm it.`;
  }

  return s;
}

/** Destinations we can answer for — used by the tool schema and diagnostics. */
export function supportedDestinations(): string[] {
  return Object.keys(WITS_REPORTERS).sort();
}
