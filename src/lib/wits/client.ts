/**
 * World Bank WITS client — India's export data.
 *
 * WHY THIS EXISTS: UN Comtrade does not hold modern India trade data. India
 * has zero annual/monthly HS records as a reporter (its only Comtrade holdings
 * are 1962-1974 SITC), and it doesn't even appear as a *partner* in other
 * countries' filings — so Comtrade mirror statistics can't rescue it either.
 * WITS (World Bank) does carry India, so it's our source for "what does India
 * export, and to whom".
 *
 * Trade-offs vs Comtrade:
 *   - Coarser products. WITS `tradestats-trade` reports HS *chapter groups*
 *     (e.g. 41-43 "HidesSkin"), not 6-digit lines. We map the caller's HS code
 *     to its group and label the result honestly.
 *   - Lags further behind: latest complete year is typically year-3.
 *   - SDMX XML, parsed with regex to stay dependency-free (the payload is a
 *     flat <Series><Obs/></Series> shape, so this is safe and predictable).
 *   - Values arrive in THOUSANDS of USD.
 */

import { createClient as createSupabase } from "@/lib/supabase/server";
import { COUNTRIES } from "@/lib/comtrade/countries";

const BASE =
  "https://wits.worldbank.org/API/V1/SDMX/V21/datasource/tradestats-trade";

// ── HS chapter → WITS product group ──────────────────────────────────────────

/** WITS chapter-range groups. Ranges are parsed from the code prefix. */
const PRODUCT_GROUPS = [
  "01-05_Animal",
  "06-15_Vegetable",
  "16-24_FoodProd",
  "25-26_Minerals",
  "27-27_Fuels",
  "28-38_Chemicals",
  "39-40_PlastiRub",
  "41-43_HidesSkin",
  "44-49_Wood",
  "50-63_TextCloth",
  "64-67_Footwear",
  "68-71_StoneGlas",
  "72-83_Metals",
  "84-85_MachElec",
  "86-89_Transport",
  "90-99_Miscellan",
] as const;

/** Human-friendly label for each group, for narratives. */
const GROUP_LABELS: Record<string, string> = {
  "01-05_Animal": "animal products",
  "06-15_Vegetable": "vegetable products",
  "16-24_FoodProd": "processed foods",
  "25-26_Minerals": "minerals",
  "27-27_Fuels": "fuels",
  "28-38_Chemicals": "chemicals",
  "39-40_PlastiRub": "plastics & rubber",
  "41-43_HidesSkin": "hides, skins & leather goods",
  "44-49_Wood": "wood, paper & pulp",
  "50-63_TextCloth": "textiles & clothing",
  "64-67_Footwear": "footwear & headgear",
  "68-71_StoneGlas": "stone, glass, gems & jewellery",
  "72-83_Metals": "metals & metal products",
  "84-85_MachElec": "machinery & electronics",
  "86-89_Transport": "transport equipment",
  "90-99_Miscellan": "instruments & miscellaneous manufactures",
};

export interface WitsGroup {
  code: string;
  label: string;
  chapterFrom: number;
  chapterTo: number;
}

/** Resolve an ITC-HS code (2/4/6 digit) to its WITS chapter group. */
export function hsToWitsGroup(hsCode: string): WitsGroup | null {
  const digits = hsCode.replace(/\D/g, "");
  if (digits.length < 2) return null;
  const chapter = Number(digits.slice(0, 2));
  if (!Number.isFinite(chapter) || chapter < 1 || chapter > 99) return null;

  for (const code of PRODUCT_GROUPS) {
    const [from, to] = code.slice(0, 5).split("-").map(Number);
    if (chapter >= from && chapter <= to) {
      return {
        code,
        label: GROUP_LABELS[code] ?? code,
        chapterFrom: from,
        chapterTo: to,
      };
    }
  }
  return null;
}

// ── Result types ─────────────────────────────────────────────────────────────

export interface WitsCountryValue {
  iso3: string;
  name: string;
  valueUsd: number;
  valueUsdM: number;
  sharePct: number;
  rank: number;
}

export interface WitsExportsData {
  hsCode: string;
  /** The WITS chapter group actually queried (coarser than the HS code). */
  group: string;
  groupLabel: string;
  year: number;
  totalUsd: number;
  totalUsdM: number;
  destinations: WitsCountryValue[];
}

export type WitsResult =
  | { ok: true; data: WitsExportsData; narrative: string; cached: boolean }
  | { ok: false; error: string; narrative: string };

// ── Cache (reuses the trade_cache table) ─────────────────────────────────────

async function readCache(key: string): Promise<WitsExportsData | null> {
  try {
    const supabase = await createSupabase();
    const { data } = await supabase
      .from("trade_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return data.payload as WitsExportsData;
  } catch {
    return null;
  }
}

async function writeCache(key: string, payload: WitsExportsData) {
  try {
    const supabase = await createSupabase();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    await supabase
      .from("trade_cache")
      .upsert(
        { cache_key: key, payload, expires_at: expires.toISOString() },
        { onConflict: "cache_key" }
      );
  } catch {
    // Non-fatal.
  }
}

// ── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Pull (partner, value) pairs out of the SDMX payload. The document is a flat
 * sequence of `<Series PARTNER="XXX" ...><Obs OBS_VALUE="n"/></Series>`.
 */
function parseSeries(xml: string): Array<{ partner: string; value: number }> {
  const out: Array<{ partner: string; value: number }> = [];
  const re =
    /<Series\b[^>]*\bPARTNER="([^"]+)"[^>]*>\s*<Obs\b[^>]*\bOBS_VALUE="([\d.eE+-]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const value = Number(m[2]);
    if (Number.isFinite(value)) out.push({ partner: m[1], value });
  }
  return out;
}

/** WITS reports in thousands of USD. */
const THOUSANDS = 1_000;

/** Latest complete year in WITS (lags further than Comtrade). */
function latestWitsYear(): number {
  return new Date().getUTCFullYear() - 3;
}

async function fetchYear(
  group: string,
  year: number
): Promise<{ ok: true; xml: string } | { ok: false; error: string }> {
  const url = `${BASE}/reporter/ind/year/${year}/partner/all/product/${group}/indicator/XPRT-TRD-VL`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/xml" },
      next: { revalidate: 60 * 60 * 24 * 7 }, // annual data — cache a week
    });
    if (!res.ok) return { ok: false, error: `WITS returned ${res.status}` };
    return { ok: true, xml: await res.text() };
  } catch (e) {
    return {
      ok: false,
      error: `Network error contacting WITS: ${
        e instanceof Error ? e.message : "unknown"
      }`,
    };
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface WitsIndiaExportsArgs {
  hsCode: string;
  year?: number;
  limit?: number;
}

/**
 * India's exports of the chapter group containing `hsCode`, broken down by
 * destination country. Region aggregates (ECS, NAC, EAS...) are dropped by
 * intersecting against our known-country list, leaving real destinations only.
 */
export async function witsIndiaExports(
  args: WitsIndiaExportsArgs
): Promise<WitsResult> {
  const group = hsToWitsGroup(args.hsCode);
  if (!group) {
    return {
      ok: false,
      error: `Could not map HS ${args.hsCode} to a product group.`,
      narrative: `I could not recognise HS ${args.hsCode} as a valid product code.`,
    };
  }

  const limit = args.limit ?? 5;
  const startYear = args.year ?? latestWitsYear();

  // WITS publishes late; walk back a couple of years if the newest is empty.
  const candidates = args.year
    ? [args.year, args.year - 1]
    : [startYear, startYear - 1, startYear - 2];

  for (const year of candidates) {
    const cacheKey = `wits:IND:${group.code}:${year}`;
    const cached = await readCache(cacheKey);
    if (cached) {
      // The cache is keyed by chapter GROUP, so a hit may have been stored for
      // a different HS code in the same group (4202 and 4201 both map to
      // 41-43). Re-stamp the caller's code so the narrative cites what they
      // actually asked about.
      const data = { ...cached, hsCode: args.hsCode };
      return { ok: true, data, cached: true, narrative: narrate(data) };
    }

    const res = await fetchYear(group.code, year);
    if (!res.ok) {
      return {
        ok: false,
        error: res.error,
        narrative:
          "I could not reach the World Bank trade database just now. Please try again shortly.",
      };
    }

    const series = parseSeries(res.xml);
    if (series.length === 0) continue; // try an earlier year

    // Keep only real countries (drops WLD and World Bank region aggregates).
    const known = new Map(COUNTRIES.map((c) => [c.iso3, c.name]));
    const countries = series
      .filter((s) => s.partner !== "WLD" && known.has(s.partner))
      .sort((a, b) => b.value - a.value);

    // Prefer the reported world total; fall back to summing what we kept.
    const worldRow = series.find((s) => s.partner === "WLD");
    const totalUsd =
      (worldRow?.value ?? countries.reduce((s, c) => s + c.value, 0)) *
      THOUSANDS;

    if (totalUsd === 0) continue;

    const destinations: WitsCountryValue[] = countries
      .slice(0, limit)
      .map((c, i) => {
        const usd = c.value * THOUSANDS;
        return {
          iso3: c.partner,
          name: known.get(c.partner) ?? c.partner,
          valueUsd: usd,
          valueUsdM: Math.round((usd / 1_000_000) * 10) / 10,
          sharePct:
            totalUsd > 0 ? Math.round((usd / totalUsd) * 1000) / 10 : 0,
          rank: i + 1,
        };
      });

    const data: WitsExportsData = {
      hsCode: args.hsCode,
      group: group.code,
      groupLabel: group.label,
      year,
      totalUsd,
      totalUsdM: Math.round((totalUsd / 1_000_000) * 10) / 10,
      destinations,
    };

    await writeCache(cacheKey, data);
    return { ok: true, data, cached: false, narrative: narrate(data) };
  }

  return {
    ok: false,
    error: "No WITS records found.",
    narrative: `I could not find India export figures for ${group.label} in the World Bank database.`,
  };
}

function narrate(d: WitsExportsData): string {
  const head =
    `In ${d.year}, India exported about $${d.totalUsdM}M of ${d.groupLabel} ` +
    `(World Bank data, HS chapters ${d.group.slice(0, 5)} — the closest ` +
    `available grouping to HS ${d.hsCode}).`;
  if (d.destinations.length === 0) return head;
  return (
    head +
    ` Top destinations: ` +
    d.destinations
      .map((c) => `${c.name} ($${c.valueUsdM}M, ${c.sharePct}%)`)
      .join(", ") +
    "."
  );
}
