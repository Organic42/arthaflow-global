import { NextResponse } from "next/server";
import { landedCost } from "@/lib/tariff/landed-cost";
import { searchHsCodes } from "@/lib/hs/classify";
import { tariffLinesFor } from "@/lib/hs/itchs";
import { supportedDestinations, WITS_REPORTERS } from "@/lib/tariff/destination";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Landed-cost calculator, for the public page at /calculator.
 *
 * Public on purpose: this is the tool a manufacturer can get value from before
 * signing up, and the one that demonstrates the whole data layer in a single
 * screen. It reaches UN/World Bank data upstream, so it is rate limited per IP.
 *
 *   GET  /api/tariff/landed-cost              -> destinations we can price
 *   GET  /api/tariff/landed-cost?q=leather+bags -> HS candidates for a product
 *   POST /api/tariff/landed-cost              -> the calculation
 */

// Upstream is a public World Bank endpoint we do not want to hammer, and the
// calculation is cheap to request but not free to serve.
const LIMIT = { scope: "landed-cost", limit: 20, windowMs: 60_000 };

function limited(request: Request) {
  const result = rateLimit(clientIp(request), LIMIT);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Too many calculations. Please wait a minute and try again." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(result.resetInMs / 1000)) },
    }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();

  // No query: the destination list, so the form can populate its dropdown from
  // the same source of truth the calculation uses.
  if (!q) {
    return NextResponse.json({
      destinations: supportedDestinations().map((iso) => ({
        iso3: iso,
        name: WITS_REPORTERS[iso].name,
      })),
    });
  }

  const blocked = limited(request);
  if (blocked) return blocked;

  // Product search. Returns the same shortlist Saathi gets — the user picks,
  // exactly as the model does, because neither should invent a code.
  const candidates = searchHsCodes(q, { limit: 6 }).map((c) => ({
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

export async function POST(request: Request) {
  const blocked = limited(request);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const num = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const hsCode = String(body.hsCode ?? "").replace(/\D/g, "");
  const destinationIso = String(body.destinationIso ?? "").trim().toUpperCase();
  const fobInr = num(body.fobInr);

  if (hsCode.length < 6 || !destinationIso || fobInr === undefined) {
    return NextResponse.json(
      { error: "Need an HS code, a destination and an invoice value." },
      { status: 400 }
    );
  }

  try {
    const result = await landedCost({
      hsCode,
      destinationIso,
      fobInr,
      freightInr: num(body.freightInr),
      insuranceInr: num(body.insuranceInr),
      quantity: num(body.quantity),
      itcCode: body.itcCode ? String(body.itcCode) : undefined,
    });

    if (!result.ok) {
      // The narrative is written for the model and carries TOOL_ERROR framing;
      // the browser gets the plain reason.
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("[landed-cost]", error);
    return NextResponse.json(
      { error: "Could not reach the tariff data source. Please try again." },
      { status: 503 }
    );
  }
}
