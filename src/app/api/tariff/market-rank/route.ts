import { NextResponse } from "next/server";
import { destinationDuty, supportedDestinations, WITS_REPORTERS } from "@/lib/tariff/destination";
import { agreementFor } from "@/lib/tariff/fta";
import { VAT_RATES, VAT_SOURCE, VAT_TABLE_AS_OF } from "@/lib/tariff/vat";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
// One request fans out to every destination we can price. Cold HS codes hit
// TRAINS once per market; warm ones come off the cache in milliseconds.
export const maxDuration = 60;

/**
 * Rank every destination for one product — "where should I sell this?"
 *
 * WHY THIS IS ITS OWN ROUTE: /api/tariff/landed-cost answers the question a
 * manufacturer asks second — "what do I net on the market I already chose".
 * The question they ask first is which market to choose at all, and no free
 * tool answers it, because answering it means pricing the same product
 * against every destination at once.
 *
 * WHY IT DOES NOT CALL landedCost(): RoDTEP and Duty Drawback are properties
 * of the goods leaving India, not of where they land — they are identical in
 * all 44 markets, so computing them 44 times would burn the upstream budget
 * to print the same number over and over. Only the buyer's side varies. So
 * this route resolves duty, VAT and trade-agreement status per destination
 * and leaves the exporter's side to the page, which already has it.
 *
 * WHY IT RANKS ON DUTY AND NOT ON LANDED COST: freight and insurance are flat
 * figures the user supplies, identical across destinations, so landed cost is
 * a strictly increasing function of the duty rate — ranking by either gives
 * the same order. Duty is the honest label for what actually differs. VAT is
 * reported but deliberately does NOT affect the ranking: a VAT-registered
 * buyer reclaims it, so letting it reorder markets would push a manufacturer
 * away from perfectly good ones for a cost their buyer never bears.
 */

// Heavier than any other public endpoint: one request can mean dozens of
// upstream lookups, so it gets its own, much tighter budget.
const LIMIT = { scope: "market-rank", limit: 4, windowMs: 60_000 };

/** Concurrency cap. High enough to finish inside maxDuration, low enough not
 *  to arrive at TRAINS as a burst of 44 simultaneous requests. */
const POOL = 10;

/** A single slow destination must not sink the whole ranking. */
const PER_DESTINATION_TIMEOUT_MS = 12_000;

interface Row {
  iso3: string;
  country: string;
  dutyRatePct: number | null;
  year: number | null;
  hasFta: boolean;
  ftaName: string | null;
  ftaClaimable: boolean;
  /** null means either "levies none" or "we hold no rate" — vatKnown separates them. */
  vatRatePct: number | null;
  vatLabel: string | null;
  vatRecoverable: boolean;
  vatKnown: boolean;
  /** Set when we could not price this market, with the reason. */
  unavailable: string | null;
}

async function priceOne(iso3: string, hsCode: string): Promise<Row> {
  const fta = agreementFor(iso3);
  const vat = VAT_RATES[iso3] ?? null;
  const base: Row = {
    iso3,
    country: WITS_REPORTERS[iso3]?.name ?? iso3,
    dutyRatePct: null,
    year: null,
    hasFta: fta !== null,
    ftaName: fta?.agreement.name ?? null,
    ftaClaimable: fta?.claimable ?? false,
    vatRatePct: vat?.standardRatePct ?? null,
    vatLabel: vat?.label ?? null,
    // SST is a sales tax, not a credit-and-refund VAT, so it sticks to the
    // buyer. Same rule assessVat() applies — kept identical on purpose.
    vatRecoverable: vat ? vat.label !== "SST" : false,
    vatKnown: vat !== null,
    unavailable: null,
  };

  try {
    const result = await Promise.race([
      destinationDuty({ destinationIso: iso3, hsCode }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), PER_DESTINATION_TIMEOUT_MS)
      ),
    ]);
    if (!result.ok) return { ...base, unavailable: "No tariff reported for this product." };
    return { ...base, dutyRatePct: result.data.mfnRatePct, year: result.data.year };
  } catch {
    // A market we could not reach is reported as unpriced, never dropped —
    // a silently shorter list would read as "these are all the options".
    return { ...base, unavailable: "Could not reach the tariff source." };
  }
}

/** Bounded-concurrency map. Workers pull from a shared cursor. */
async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function POST(request: Request) {
  const limited = rateLimit(clientIp(request), LIMIT);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many market rankings. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limited.resetInMs / 1000)) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // TRAINS speaks HS-6. An 8-digit line is India's own extension and means
  // nothing to an importing country's schedule.
  const hsCode = String(body.hsCode ?? "").replace(/\D/g, "").slice(0, 6);
  if (hsCode.length !== 6) {
    return NextResponse.json({ error: "Need a 6-digit HS code." }, { status: 400 });
  }

  try {
    // IND is a WITS reporter like any other and nonsense as an export
    // destination for an Indian exporter.
    const isos = supportedDestinations().filter((iso) => iso !== "IND");
    const rows = await pool(isos, POOL, (iso) => priceOne(iso, hsCode));

    // Cheapest duty first; unpriced markets last, so the list never implies
    // a market is expensive when we simply could not read its tariff.
    rows.sort((a, b) => {
      if (a.dutyRatePct === null && b.dutyRatePct === null) return a.country.localeCompare(b.country);
      if (a.dutyRatePct === null) return 1;
      if (b.dutyRatePct === null) return -1;
      if (a.dutyRatePct !== b.dutyRatePct) return a.dutyRatePct - b.dutyRatePct;
      // Same duty: a claimable agreement is the tie-breaker that actually
      // changes what the buyer pays.
      if (a.ftaClaimable !== b.ftaClaimable) return a.ftaClaimable ? -1 : 1;
      return a.country.localeCompare(b.country);
    });

    const priced = rows.filter((r) => r.dutyRatePct !== null);
    return NextResponse.json({
      data: {
        hsCode,
        rows,
        pricedCount: priced.length,
        totalCount: rows.length,
        ftaCount: priced.filter((r) => r.ftaClaimable).length,
        dutyFreeCount: priced.filter((r) => r.dutyRatePct === 0).length,
        vatAsOf: VAT_TABLE_AS_OF,
        vatSource: VAT_SOURCE,
      },
    });
  } catch (error) {
    console.error("[market-rank]", error);
    return NextResponse.json(
      { error: "Could not rank markets right now. Please try again." },
      { status: 503 }
    );
  }
}
