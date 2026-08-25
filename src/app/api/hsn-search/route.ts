import { NextResponse } from "next/server";
import { searchHsCodes, lookupHsCode } from "@/lib/hs/classify";
import {
  tariffLinesFor,
  lookupTariffLine,
  ITCHS_SOURCE,
  type TariffLine,
} from "@/lib/hs/itchs";
import { lookupRodtep, describeRodtep, RODTEP_SOURCE } from "@/lib/hs/rodtep";
import { drawbackForHsCode, describeDrawback, DRAWBACK_SOURCE } from "@/lib/hs/drawback";
import { lookupGst, describeGst, GST_SOURCE } from "@/lib/hs/gst";
import {
  indiaExportsFor,
  describeIndiaExports,
  INDIA_EXPORTS_SOURCE,
} from "@/lib/hs/india-exports";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * HSN code search, for the public page at /hsn-search.
 *
 * Unlike /api/tariff/landed-cost, everything here is bundled data — no upstream
 * call, ever. Rate limited anyway: the lookups are cheap per request, but cheap
 * per request times unlimited requests is still a way to lean on the server.
 *
 *   GET /api/hsn-search?q=leather+bags   -> shortlist to choose from (text or a
 *                                           bare HS/HSN code, 2-8 digits)
 *   GET /api/hsn-search?code=42022110    -> full detail for one 8-digit line
 */

const LIMIT = { scope: "hsn-search", limit: 40, windowMs: 60_000 };

function limited(request: Request) {
  const result = rateLimit(clientIp(request), LIMIT);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Too many searches. Please wait a minute and try again." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(result.resetInMs / 1000)) },
    }
  );
}

/**
 * The four levels an 8-digit ITC-HS code resolves through, each with the
 * nomenclature's own wording for that level.
 *
 * The split matters and is not cosmetic: the first six digits are the
 * international HS 2022 nomenclature — the same classification UN Comtrade
 * answers to — and only the last two are India's own tariff line. Conflating
 * them is the mistake classify.ts exists to prevent, so the UI is given what it
 * needs to show the boundary rather than printing one flat string.
 */
function codeLevels(line: TariffLine) {
  const c = line.code;
  const international = [
    { digits: c.slice(0, 2), at: c.slice(0, 2), level: "Chapter" },
    { digits: c.slice(2, 4), at: c.slice(0, 4), level: "Heading" },
    { digits: c.slice(4, 6), at: c.slice(0, 6), level: "Subheading" },
  ].map((s) => ({
    ...s,
    title: lookupHsCode(s.at)?.description ?? "",
    indian: false,
  }));

  return [
    ...international,
    {
      digits: c.slice(6, 8),
      at: c,
      level: "Tariff line",
      // DGFT's own wording for the line, not the international heading's.
      title: line.description,
      indian: true,
    },
  ];
}

function lineDetail(code: string) {
  const line = lookupTariffLine(code);
  if (!line) return null;

  const gst = lookupGst(line.code);
  const rodtep = lookupRodtep(line.code);
  const drawback = drawbackForHsCode(line.code);
  // What India actually ships of this line. Every other field here is a
  // rule; this is the only one that says whether the trade exists.
  const trade = indiaExportsFor(line.code);

  return {
    code: line.code,
    description: line.description,
    unit: line.unit,
    hsParent: line.hsParent,
    levels: codeLevels(line),
    policy: line.policy,
    condition: line.condition,
    gst: { ...gst, description: describeGst(gst) },
    rodtep: rodtep && { ...rodtep, description: describeRodtep(rodtep) },
    drawback: drawback && { ...drawback, description: describeDrawback(drawback) },
    trade: trade && { ...trade, description: describeIndiaExports(trade) },
    sources: {
      itchs: ITCHS_SOURCE.note,
      gst: GST_SOURCE.notification,
      rodtep: RODTEP_SOURCE.note,
      drawback: DRAWBACK_SOURCE.note,
      trade: INDIA_EXPORTS_SOURCE.note,
    },
  };
}

export async function GET(request: Request) {
  const blocked = limited(request);
  if (blocked) return blocked;

  const url = new URL(request.url);
  const codeParam = url.searchParams.get("code")?.trim();
  const q = url.searchParams.get("q")?.trim();

  // Step 2: full detail for one chosen 8-digit tariff line.
  if (codeParam) {
    const digits = codeParam.replace(/\D/g, "");
    const detail = digits.length === 8 ? lineDetail(digits) : null;
    if (!detail) {
      return NextResponse.json({ error: "Unknown Indian tariff line." }, { status: 404 });
    }
    return NextResponse.json({ data: detail });
  }

  if (!q) return NextResponse.json({ candidates: [] });

  const digits = q.replace(/\D/g, "");
  const isBareCode = digits.length === q.length && digits.length >= 2;

  // A user pasting the 8-digit line directly can skip straight to one result —
  // no ranking needed, the code is either valid or it isn't.
  if (isBareCode && digits.length === 8) {
    const line = lookupTariffLine(digits);
    if (!line) return NextResponse.json({ candidates: [] });
    return NextResponse.json({
      candidates: [
        {
          code: line.hsParent,
          description: line.description,
          lines: [{ code: line.code, description: line.description, policy: line.policy }],
        },
      ],
    });
  }

  // A shorter bare code (2, 4 or 6 digits) resolves to its heading, then to
  // whatever 8-digit lines DGFT lists under it — same path as free text below,
  // just skipping the ranking step since there is nothing to rank.
  if (isBareCode) {
    const found = lookupHsCode(digits);
    if (!found) return NextResponse.json({ candidates: [] });
    const lines = tariffLinesFor(found.code).map((l) => ({
      code: l.code,
      description: l.description,
      policy: l.policy,
    }));
    return NextResponse.json({
      candidates: [{ code: found.code, description: found.description, lines }],
    });
  }

  // Free text: same shortlist Saathi and the calculator get — the user picks,
  // because neither a ranking algorithm nor a model should choose for them.
  const candidates = searchHsCodes(q, { limit: 8 }).map((c) => ({
    code: c.code,
    description: c.description,
    lines: tariffLinesFor(c.code).map((l) => ({
      code: l.code,
      description: l.description,
      policy: l.policy,
    })),
  }));

  return NextResponse.json({ query: q, candidates });
}
