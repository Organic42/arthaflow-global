/**
 * UN Comtrade Plus API client.
 * https://comtradeplus.un.org  ·  https://comtradeapi.un.org/data/v1/get/{typeCode}/{freqCode}/{clCode}
 *
 * Requires COMTRADE_API_KEY env var. Register free at:
 *   https://comtradeplus.un.org/  →  Account  →  API Keys
 *   (Free tier: ~500 records/response, 500 requests/day.)
 *
 * Design principles:
 *   - Lazy client (never construct at module scope — breaks builds without env).
 *   - Cache aggressively (trade data updates monthly).
 *   - Fail informatively (return typed errors, never throw opaque).
 */

import { createClient as createSupabase } from "@/lib/supabase/server";

const BASE_URL = "https://comtradeapi.un.org/data/v1/get";

// ── Types ────────────────────────────────────────────────────────────────────

export type FlowCode = "X" | "M" | "RX" | "RM"; // eXport, iMport, Re-eXport, Re-iMport
export type FreqCode = "A" | "M";                 // Annual, Monthly
export type TypeCode = "C" | "S";                 // Commodities, Services

export interface ComtradeQuery {
  reporterCode: number | number[]; // M49 (0 = "World")
  partnerCode?: number | number[]; // Default 0 (all partners)
  cmdCode?: string | string[];     // HS code(s), e.g. "8412"
  period: number | number[] | string | string[]; // Year (2023) or year-month (202301)
  flowCode?: FlowCode | FlowCode[];
  freq?: FreqCode;
  type?: TypeCode;
  clCode?: "HS";                   // Only HS supported here
  maxRecords?: number;             // Default 500 free tier
}

export interface ComtradeRecord {
  period: string;
  refPeriodId?: number;
  reporterCode: number;
  reporterISO: string;
  reporterDesc: string;
  partnerCode: number;
  partnerISO: string;
  partnerDesc: string;
  cmdCode: string;
  cmdDesc: string;
  flowCode: string;
  flowDesc: string;
  primaryValue: number;   // USD
  netWgt?: number;        // kg
  qty?: number;
  qtyUnitAbbr?: string;
}

export interface ComtradeResponse {
  elapsedTime?: string;
  count: number;
  data: ComtradeRecord[];
}

export interface ComtradeError {
  ok: false;
  code:
    | "NO_API_KEY"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR"
    | "PARSE_ERROR"
    | "NO_DATA";
  message: string;
  status?: number;
}

export interface ComtradeSuccess {
  ok: true;
  data: ComtradeRecord[];
  count: number;
  cached: boolean;
}

export type ComtradeResult = ComtradeSuccess | ComtradeError;

// ── Cache key ────────────────────────────────────────────────────────────────

function cacheKey(q: ComtradeQuery): string {
  // Deterministic cache key — order-independent
  const normalized = {
    type: q.type ?? "C",
    freq: q.freq ?? "A",
    cl: q.clCode ?? "HS",
    reporter: [q.reporterCode].flat().sort().join(","),
    partner: [q.partnerCode ?? 0].flat().sort().join(","),
    cmd: [q.cmdCode ?? ""].flat().sort().join(","),
    period: [q.period].flat().sort().join(","),
    flow: [q.flowCode ?? ""].flat().sort().join(","),
    max: q.maxRecords ?? 500,
  };
  return JSON.stringify(normalized);
}

// ── Cache lookup / write ─────────────────────────────────────────────────────

async function readCache(
  key: string
): Promise<{ data: ComtradeRecord[]; count: number } | null> {
  try {
    const supabase = await createSupabase();
    const { data } = await supabase
      .from("trade_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .maybeSingle();

    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return data.payload as { data: ComtradeRecord[]; count: number };
  } catch {
    // If cache read fails, silently fall through to live fetch.
    return null;
  }
}

async function writeCache(
  key: string,
  payload: { data: ComtradeRecord[]; count: number }
): Promise<void> {
  try {
    const supabase = await createSupabase();
    const expires = new Date();
    expires.setDate(expires.getDate() + 30); // 30-day TTL
    await supabase.from("trade_cache").upsert(
      {
        cache_key: key,
        payload,
        expires_at: expires.toISOString(),
      },
      { onConflict: "cache_key" }
    );
  } catch {
    // Cache write failures are non-fatal.
  }
}

// ── Core fetcher ─────────────────────────────────────────────────────────────

/**
 * Fetch trade records from UN Comtrade with caching.
 * Returns a discriminated-union result — check `ok` before using data.
 */
export async function comtradeQuery(q: ComtradeQuery): Promise<ComtradeResult> {
  const apiKey = process.env.COMTRADE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      code: "NO_API_KEY",
      message:
        "COMTRADE_API_KEY is not set. Register at https://comtradeplus.un.org to get one.",
    };
  }

  const key = cacheKey(q);
  const cached = await readCache(key);
  if (cached) {
    return { ok: true, data: cached.data, count: cached.count, cached: true };
  }

  const typeCode = q.type ?? "C";
  const freqCode = q.freq ?? "A";
  const clCode = q.clCode ?? "HS";
  const url = new URL(`${BASE_URL}/${typeCode}/${freqCode}/${clCode}`);

  // Convert array params to comma-separated strings (Comtrade convention)
  const params: Record<string, string> = {
    reporterCode: [q.reporterCode].flat().join(","),
    partnerCode: [q.partnerCode ?? 0].flat().join(","),
    period: [q.period].flat().join(","),
    maxRecords: String(q.maxRecords ?? 500),
    format: "JSON",
    includeDesc: "true",
  };
  if (q.cmdCode) params.cmdCode = [q.cmdCode].flat().join(",");
  if (q.flowCode) params.flowCode = [q.flowCode].flat().join(",");

  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        Accept: "application/json",
      },
      // Cache at the fetch layer too (Next.js server cache)
      next: { revalidate: 60 * 60 * 24 }, // 24 hours
    });
  } catch (e) {
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      message: `Network error contacting Comtrade: ${
        e instanceof Error ? e.message : "unknown"
      }`,
    };
  }

  if (res.status === 429) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      status: 429,
      message: "Comtrade rate limit hit. Try again later or upgrade tier.",
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      status: res.status,
      message: `Comtrade returned ${res.status}: ${await res.text().catch(() => "")}`,
    };
  }

  let json: ComtradeResponse;
  try {
    json = (await res.json()) as ComtradeResponse;
  } catch {
    return {
      ok: false,
      code: "PARSE_ERROR",
      message: "Comtrade response was not valid JSON.",
    };
  }

  if (!Array.isArray(json.data) || json.data.length === 0) {
    return {
      ok: false,
      code: "NO_DATA",
      message: "No records found for this query.",
    };
  }

  await writeCache(key, { data: json.data, count: json.count });
  return { ok: true, data: json.data, count: json.count, cached: false };
}
